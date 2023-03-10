// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title The ConfirmedOwner contract
 * @notice A contract with helpers for basic contract ownership.
 * @dev derived from https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/ConfirmedOwnerWithProposal.sol
 */
contract ConfirmedOwnerWithProposal {
    address private _owner;
    address private _pendingOwner;

    event OwnershipTransferRequested(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Allows an owner to begin transferring ownership to a new address,
     * pending.
     */
    function transferOwnership(address to) public onlyOwner {
        _transferOwnership(to);
    }

    /**
     * @notice Allows an ownership transfer to be completed by the recipient.
     */
    function acceptOwnership() external {
        require(msg.sender == _pendingOwner, "Must be proposed owner");

        address oldOwner = _owner;
        _owner = msg.sender;
        _pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    /**
     * @notice Get the current owner
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @notice validate, transfer ownership, and emit relevant events
     */
    function _transferOwnership(address to) private {
        require(to != msg.sender, "Cannot transfer to self");

        _pendingOwner = to;

        emit OwnershipTransferRequested(_owner, to);
    }

    /**
     * @notice validate access
     */
    function _validateOwnership() internal view {
        require(msg.sender == _owner, "Only callable by owner");
    }

    /**
     * @notice Reverts if called by anyone other than the contract owner.
     */
    modifier onlyOwner() {
        _validateOwnership();
        _;
    }
}
