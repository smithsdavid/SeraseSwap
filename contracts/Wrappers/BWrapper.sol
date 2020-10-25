// License: GPL3

pragma solidity 0.5.12;

import "./BNum.sol";

interface IERC20 {
    event Approval(address indexed src, address indexed dst, uint amt);
    event Transfer(address indexed src, address indexed dst, uint amt);

    function totalSupply() external view returns (uint);
    function balanceOf(address whom) external view returns (uint);
    function allowance(address src, address dst) external view returns (uint);
    function approve(address dst, uint amt) external returns (bool);
    function transfer(address dst, uint amt) external returns (bool);
    function transferFrom(address src, address dst, uint amt) external returns (bool);
}

contract BTokenBase is BNum {

    mapping(address => uint) internal _balance;
    mapping(address => mapping(address=>uint)) internal _allowance;
    uint internal _totalSupply;

    event Approval(address indexed src, address indexed dst, uint amt);
    event Transfer(address indexed src, address indexed dst, uint amt);

    function _mint(uint amt) internal {
        _balance[address(this)] = badd(_balance[address(this)], amt);
        _totalSupply = badd(_totalSupply, amt);
        emit Transfer(address(0), address(this), amt);
    }

    function _burn(uint amt) internal {
        require(_balance[address(this)] >= amt, "ERR_INSUFFICIENT_BAL");
        _balance[address(this)] = bsub(_balance[address(this)], amt);
        _totalSupply = bsub(_totalSupply, amt);
        emit Transfer(address(this), address(0), amt);
    }

    function _move(address src, address dst, uint amt) internal {
        require(_balance[src] >= amt, "ERR_INSUFFICIENT_BAL");
        _balance[src] = bsub(_balance[src], amt);
        _balance[dst] = badd(_balance[dst], amt);
        emit Transfer(src, dst, amt);
    }

    function _push(address to, uint amt) internal {
        _move(address(this), to, amt);
    }

    function _pull(address from, uint amt) internal {
        _move(from, address(this), amt);
    }
}

contract BToken is BTokenBase, IERC20 {

    string  private _name     = "USD Synth";
    string  private _symbol   = "USDs";
    uint8   private _decimals = 18;

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns(uint8) {
        return _decimals;
    }

    function allowance(address src, address dst) external view returns (uint) {
        return _allowance[src][dst];
    }

    function balanceOf(address whom) external view returns (uint) {
        return _balance[whom];
    }

    function totalSupply() public view returns (uint) {
        return _totalSupply;
    }

    function approve(address dst, uint amt) external returns (bool) {
        _allowance[msg.sender][dst] = amt;
        emit Approval(msg.sender, dst, amt);
        return true;
    }

    function increaseApproval(address dst, uint amt) external returns (bool) {
        _allowance[msg.sender][dst] = badd(_allowance[msg.sender][dst], amt);
        emit Approval(msg.sender, dst, _allowance[msg.sender][dst]);
        return true;
    }

    function decreaseApproval(address dst, uint amt) external returns (bool) {
        uint oldValue = _allowance[msg.sender][dst];
        if (amt > oldValue) {
            _allowance[msg.sender][dst] = 0;
        } else {
            _allowance[msg.sender][dst] = bsub(oldValue, amt);
        }
        emit Approval(msg.sender, dst, _allowance[msg.sender][dst]);
        return true;
    }

    function transfer(address dst, uint amt) external returns (bool) {
        _move(msg.sender, dst, amt);
        return true;
    }

    function transferFrom(address src, address dst, uint amt) external returns (bool) {
        require(msg.sender == src || amt <= _allowance[src][msg.sender], "ERR_BTOKEN_BAD_CALLER");
        _move(src, dst, amt);
        if (msg.sender != src && _allowance[src][msg.sender] != uint256(-1)) {
            _allowance[src][msg.sender] = bsub(_allowance[src][msg.sender], amt);
            emit Approval(msg.sender, dst, _allowance[src][msg.sender]);
        }
        return true;
    }

    function mint(address account, uint256 amount) internal  returns (bool) {
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply = badd(_totalSupply, amount);
        _balance[account] = badd(_balance[account], amount);
        emit Transfer(address(0), account, amount);
        return true;
    }

    function burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");
        _totalSupply = bsub(_totalSupply, value);
        _balance[account] = bsub(_balance[account], value);
        emit Transfer(account, address(0), value);
    }

}

contract BWrapper is BToken {
    event Log_Wrap(address indexed caller, uint256 amount, uint256 fee, uint256 price, uint256 timestamp);
    event Log_Unwrap(address indexed caller, uint256 amount, uint256 fee, uint256 price, uint256 timestamp);
    event Log_WrapFee(address indexed caller, uint256 oldfee, uint256 newfee);
    event Log_UnwrapFee(address indexed caller, uint256 oldfee, uint256 newfee);
    event Log_Collector(address indexed caller, address indexed collector);
    event Log_Controller(address indexed caller, address indexed controller);
    event Log_SetPrice(address indexed caller, uint256 oldPrice, uint256 newPrice, uint256 timestamp);

    address private _controller;
    address private _collector;
    uint256 private _wrapfee;
    uint256 private _unwrapfee;
    uint256 private _price;
    uint256 public  constant UNIT = 10**18;

    constructor() public {
        _controller  = msg.sender;
        _collector   = msg.sender;
        _wrapfee     = 100;  // 1%
        _unwrapfee   = 100;  // 1%
        _price       = UNIT; // 1.0 
    }

    function wrap() external payable {
        uint256 value = uint256(msg.value);
        require(value >= 0, "ERR_INVALID_AMOUNT");
        uint256 quant  = bmul(value, _price);
        uint256 total  = bdiv(quant, UNIT);
        uint256 perct  = bmul(total, _wrapfee);
        uint256 fee    = bdiv(perct, 10000);
        uint256 amount = bsub(total, fee);
        if(fee>0){ mint(_collector, fee); }
        if(amount>0){ mint(msg.sender, amount); }
        emit Log_Wrap(msg.sender, value, fee, _price, block.timestamp);
    }

    function unwrap(uint256 value) external {
        require(value >= 0, "ERR_INVALID_AMOUNT");
        require(value <= msg.sender.balance, "ERR_NO_BALANCE");
        address payable src = msg.sender;
        uint256 perct   = bmul(value, _unwrapfee);
        uint256 fee     = bdiv(perct, 10000);
        uint256 amount  = bsub(value, fee);
        uint256 quant   = bmul(amount, UNIT);
        uint256 total   = bdiv(quant, _price);
        address self    = address(this);
        uint256 balance = self.balance;
        require(total <= balance, "ERR_NO_BALANCE");
        if(fee   > 0){ mint(_collector, fee); }
        if(value > 0){ burn(src, value); }
        if(total > 0){ src.transfer(total); }
        emit Log_Unwrap(src, value, fee, _price, block.timestamp);
    }

    function getCollector() external view returns (address) {
        return _collector;
    }

    function setCollector(address payable any) external {
        require(msg.sender == _controller, "ERR_NO_CONTROLLER");
        _collector = any;
        emit Log_Collector(msg.sender, any);
    }

    function getController() external view returns (address) {
        return _controller;
    }

    function setController(address any) external {
        require(msg.sender == _controller, "ERR_NO_CONTROLLER");
        _controller = any;
        emit Log_Controller(msg.sender, any);
    }

    function getWrapFee() external view returns (uint256) {
        return _wrapfee;
    }

    function setWrapFee(uint256 fee) external {
        require(msg.sender == _controller, "ERR_NO_CONTROLLER");
        require(fee >= 0, "ERR_INVALID_FEE");
        _wrapfee = fee;
        emit Log_WrapFee(msg.sender, _wrapfee, fee);
    }

    function getUnwrapFee() external view returns (uint256) {
        return _unwrapfee;
    }

    function setUnwrapFee(uint256 fee) external {
        require(msg.sender == _controller, "ERR_NO_CONTROLLER");
        require(fee >= 0, "ERR_INVALID_FEE");
        _unwrapfee = fee;
        emit Log_UnwrapFee(msg.sender, _unwrapfee, fee);
    }

    function getPrice() external view returns (uint256) {
        return _price;
    }

    function setPrice(uint256 newPrice) public {
        require(msg.sender == _controller, "ERR_NO_CONTROLLER");
        require(newPrice > 0, "ERR_INVALID_PRICE");
        uint256 oldPrice  = _price;
        _price = newPrice;
        emit Log_SetPrice(msg.sender, oldPrice, newPrice, block.timestamp);
    }

}

// END