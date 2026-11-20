// Emit Sourcify verification bundle: std-input.json + metadata.json for AgentWall only.
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const input = {
  language: 'Solidity',
  sources: {
    'AgentWall.sol': { content: fs.readFileSync(path.join(__dirname, '..', 'contracts', 'AgentWall.sol'), 'utf8') },
  },
  settings: {
    evmVersion: 'shanghai',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'metadata', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

fs.writeFileSync(path.join(__dirname, '..', 'build', 'std-input.json'), JSON.stringify(input));
const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  for (const e of out.errors) console.log(e.severity.toUpperCase(), e.formattedMessage);
  if (out.errors.some((e) => e.severity === 'error')) process.exit(1);
}
const c = out.contracts['AgentWall.sol']['AgentWall'];
fs.writeFileSync(path.join(__dirname, '..', 'build', 'metadata.json'), c.metadata);
const prev = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'AgentWall.json'), 'utf8'));
console.log('deployed bytecode identical to earlier build:', '0x' + c.evm.deployedBytecode.object === prev.bytecode.replace(/a264.*$/, '') || ('0x' + c.evm.deployedBytecode.object).length);
console.log('runtime bytes:', c.evm.deployedBytecode.object.length / 2);
console.log('metadata written');
