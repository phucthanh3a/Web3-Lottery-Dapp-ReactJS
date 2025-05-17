// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Lottery {
    address public manager;
    address payable[] public players;
    address payable public winner;
    bool public isComplete;
    bool public claimed;

    constructor() {
        manager = msg.sender;
        isComplete = false;
        claimed = false;
    }

    modifier restricted() {
        require(msg.sender == manager, "Only manager can call this function.");
        _;
    }

    function getManager() public view returns (address) {
        return manager;
    }

    function getWinner() public view returns (address) {
        return winner;
    }

    function status() public view returns (bool) {
        return isComplete;
    }

    function enter() public payable {
        require(msg.value >= 0.001 ether, "Minimum 0.001 ETH required.");
        require(!isComplete, "Lottery has already completed.");
        players.push(payable(msg.sender));
    }

    function pickWinner() public restricted {
        require(players.length > 0, "No players entered.");
        require(!isComplete, "Winner already picked.");
        winner = players[randomNumber() % players.length];
        isComplete = true;
    }

    function claimPrize() public {
        require(isComplete, "Lottery not complete.");
        require(msg.sender == winner, "Only winner can claim prize.");
        require(!claimed, "Prize already claimed.");

        uint prizeAmount = address(this).balance;
        claimed = true;
        winner.transfer(prizeAmount);

        // ✅ Reset state for next round
        isComplete = false;
        claimed = false;
        winner = payable(address(0));

        // clear players
        delete players;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    function randomNumber() private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, players.length)));
    }
}
