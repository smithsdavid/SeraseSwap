pragma solidity =0.6.6;

import "./SafeMath.sol";

contract ONES {
    using SafeMath for uint256;

    event Log_Approval(address indexed src, address indexed guy, uint256 wad);
    event Log_Transfer(address indexed src, address indexed dst, uint256 wad);
    event Log_Wrap(address indexed caller, uint256 amount, uint256 fee);
    event Log_Unwrap(address indexed caller, uint256 amount, uint256 fee);
    event Log_WrapFee(address indexed caller, uint256 oldfee, uint256 newfee);
    event Log_UnwrapFee(address indexed caller, uint256 oldfee, uint256 newfee);
    event Log_Collector(address indexed caller, address indexed collector);
    event Log_Controller(address indexed caller, address indexed controller);

    address private _controller;
    address private _collector;
    uint256 private _wrapfee;
    uint256 private _unwrapfee;

    string  public name     = "ONE Synth";
    string  public symbol   = "ONEs";
    uint8   public decimals = 18;

    mapping (address => uint256)                       public  balanceOf;
    mapping (address => mapping (address => uint256))  public  allowance;

    constructor() 
    public {
        _controller = msg.sender;
        _collector  = msg.sender;
        _wrapfee    = 100; // 1%
        _unwrapfee  = 100; // 1%
    }

    receive() external payable {
        wrap();
    }

    function wrap() public payable {
        uint256 value = uint256(msg.value);
        require(value > 0, "ERR_INVALID_AMOUNT");
        uint256 fee = value.mul(_wrapfee).div(10000);
        uint256 amount = value.sub(fee);
        balanceOf[_collector] += fee;
        balanceOf[msg.sender] += amount;
        emit Log_Wrap(msg.sender, value, fee);
    }

    function unwrap(uint256 value) public {
        require(value > 0, "ERR_INVALID_AMOUNT");
        require(value <= balanceOf[msg.sender], "ERR_NO_BALANCE");
        uint256 fee = value.mul(_unwrapfee).div(10000);
        uint256 amount = value.sub(fee);
        balanceOf[_collector] += fee;
        balanceOf[msg.sender] -= value;
        msg.sender.transfer(amount);
        emit Log_Unwrap(msg.sender, value, fee);
    }

    function totalSupply() public view returns (uint256) {
        address payable self = address(this);
        uint256 balance = self.balance;
        return balance;
    }

    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Log_Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint256 wad)
        public
        returns (bool)
    {
        require(balanceOf[src] >= wad);

        if (src != msg.sender && allowance[src][msg.sender] != uint256(-1)) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Log_Transfer(src, dst, wad);

        return true;
    }

    function getCollector()
        external view
        returns (address)
    {
        return _collector;
    }

    function setCollector(address payable any)
        external
    {
        require(msg.sender == _controller, "ERR_NOT_CONTROLLER");
        emit Log_Collector(msg.sender, any);
        _collector = any;
    }

    function getController()
        external view
        returns (address)
    {
        return _controller;
    }

    function setController(address any)
        external
    {
        require(msg.sender == _controller, "ERR_NOT_CONTROLLER");
        emit Log_Controller(msg.sender, any);
        _controller = any;
    }

    function getWrapFee()
        external view
        returns (uint256)
    {
        return _wrapfee;
    }

    function setWrapFee(uint256 fee)
        external
    {
        require(msg.sender == _controller, "ERR_NOT_CONTROLLER");
        require(fee >= 0, "ERR_INVALID_FEE");
        emit Log_WrapFee(msg.sender, _wrapfee, fee);
        _wrapfee = fee;
    }

    function getUnwrapFee()
        external view
        returns (uint256)
    {
        return _unwrapfee;
    }

    function setUnwrapFee(uint256 fee)
        external
    {
        require(msg.sender == _controller, "ERR_NOT_CONTROLLER");
        require(fee >= 0, "ERR_INVALID_FEE");
        emit Log_UnwrapFee(msg.sender, _unwrapfee, fee);
        _unwrapfee = fee;
    }

}
