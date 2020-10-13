pragma solidity >=0.4.21 <0.6.0;

import "./ERC20Detailed.sol";
import "./ERC20Mintable.sol";
import "./ERC20.sol";

contract HRC20 is ERC20, ERC20Detailed, ERC20Mintable {
    constructor(string memory _name, string memory _symbols, uint8 _decimals, uint256 _amount) 
    ERC20Detailed(_name, _symbols, _decimals)
    public {
        _mint(msg.sender, _amount);
    }
}