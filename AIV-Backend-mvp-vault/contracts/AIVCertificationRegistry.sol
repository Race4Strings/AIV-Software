// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AIVCertificationRegistry {
    event IdentityCertified(
        bytes32 indexed dataHash,
        address indexed certifier,
        uint256 timestamp,
        string twinId
    );

    mapping(bytes32 => uint256) public certificationTimestamps;

    function certify(bytes32 dataHash, string calldata twinId) external {
        require(certificationTimestamps[dataHash] == 0, "Already certified");
        certificationTimestamps[dataHash] = block.timestamp;
        emit IdentityCertified(dataHash, msg.sender, block.timestamp, twinId);
    }

    function verify(bytes32 dataHash) external view returns (uint256) {
        return certificationTimestamps[dataHash];
    }
}
