// Compile AgentWall.sol + MockAgentID.sol with solc-js into build/*.json
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const sources = {};
for (const f of ['AgentWall.sol', 'MockAgentID.sol']) {
  sources[f] = { content: fs.readFileSync(path.join(__dirname, '..', 'contracts', f), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    evmVersion: 'shanghai',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  for (const e of out.errors) {
    console.log(e.severity.toUpperCase(), e.formattedMessage);
    if (e.severity === 'error') process.exitCode = 1;
  }
}
if (process.exitCode) process.exit(1);

fs.mkdirSync(path.join(__dirname, '..', 'build'), { recursive: true });
for (const [file, contracts] of Object.entries(out.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    fs.writeFileSync(
      path.join(__dirname, '..', 'build', name + '.json'),
      JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, deployedSize: (c.evm.deployedBytecode.object.length / 2) }, null, 2)
    );
    console.log('compiled', file, name, 'runtime bytes:', c.evm.deployedBytecode.object.length / 2);
  }
}
console.log('solc version:', solc.version());
