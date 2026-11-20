// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal read interface for the SPACE ID Agent ID contract
///         (BNB Chain mainnet: 0x60b9262456de011f7d15a54cdd8c48baaa8b022f).
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title AgentWall — an on-chain guestbook exclusively for Agent ID holders
/// @notice Anyone whose wallet holds an Agent ID (name.ai) can sign the wall
///         with a short public note. Agent ID is the access control: no Agent
///         ID, no signing. The contract has no owner, no admin keys, no fees
///         and no upgrade path — it is fully immutable once deployed.
contract AgentWall {
    /// @notice The Agent ID registry contract checked on every sign().
    IAgentID public immutable agentId;

    /// @notice Maximum note length in bytes.
    uint256 public constant MAX_MESSAGE_BYTES = 140;

    struct Note {
        address signer;
        string message;
        uint256 timestamp;
    }

    Note[] internal _notes;

    /// @notice Whether an address has signed at least once.
    mapping(address => bool) public hasSigned;

    /// @notice Number of distinct Agent ID addresses that have signed.
    uint256 public uniqueSigners;

    event Signed(address indexed signer, uint256 indexed noteIndex, string message);

    constructor(address agentIdContract) {
        require(agentIdContract != address(0), "AgentWall: zero agentId");
        agentId = IAgentID(agentIdContract);
    }

    /// @notice True if `account` currently holds an Agent ID.
    function isAgent(address account) public view returns (bool) {
        return agentId.balanceOf(account) > 0;
    }

    /// @notice Sign the wall with a short note. Requires holding an Agent ID.
    /// @param message The note text (1..140 bytes).
    function sign(string calldata message) external {
        require(isAgent(msg.sender), "AgentWall: Agent ID required");
        uint256 len = bytes(message).length;
        require(len > 0 && len <= MAX_MESSAGE_BYTES, "AgentWall: bad length");

        _notes.push(Note({signer: msg.sender, message: message, timestamp: block.timestamp}));
        if (!hasSigned[msg.sender]) {
            hasSigned[msg.sender] = true;
            uniqueSigners += 1;
        }
        emit Signed(msg.sender, _notes.length - 1, message);
    }

    /// @notice Total number of notes on the wall.
    function noteCount() external view returns (uint256) {
        return _notes.length;
    }

    /// @notice Read one note by index.
    function noteAt(uint256 index) external view returns (address signer, string memory message, uint256 timestamp) {
        Note storage n = _notes[index];
        return (n.signer, n.message, n.timestamp);
    }

    /// @notice Read the most recent `limit` notes, newest first.
    function latest(uint256 limit) external view returns (Note[] memory) {
        uint256 total = _notes.length;
        uint256 count = limit < total ? limit : total;
        Note[] memory out = new Note[](count);
        for (uint256 i = 0; i < count; i++) {
            out[i] = _notes[total - 1 - i];
        }
        return out;
    }
}
