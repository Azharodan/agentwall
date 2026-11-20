// Local functional test: deploy MockAgentID + AgentWall on ganache and exercise the gate.
const { ethers } = require('ethers');
const ganache = require('ganache');
const fs = require('fs');
const path = require('path');

function artifact(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', name + '.json'), 'utf8'));
}

(async () => {
  const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true } }));
  const deployer = await provider.getSigner(0);
  const agent = await provider.getSigner(1);   // will hold a mock Agent ID
  const stranger = await provider.getSigner(2); // no Agent ID

  const mockArt = artifact('MockAgentID');
  const mock = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, deployer).deploy();
  await mock.waitForDeployment();
  console.log('mock AgentID at', await mock.getAddress());

  const wallArt = artifact('AgentWall');
  const wall = await new ethers.ContractFactory(wallArt.abi, wallArt.bytecode, deployer).deploy(await mock.getAddress());
  await wall.waitForDeployment();
  console.log('AgentWall at', await wall.getAddress());

  let failures = 0;
  const check = (label, cond) => { console.log((cond ? 'PASS' : 'FAIL'), label); if (!cond) failures++; };

  check('isAgent(stranger) == false', (await wall.isAgent(await stranger.getAddress())) === false);

  // Non-holder cannot sign
  let reverted = false;
  try { await wall.connect(stranger).sign('hello from stranger'); } catch { reverted = true; }
  check('non-holder sign() reverts', reverted);

  // Give agent an ID, then sign works
  await (await mock.mint(await agent.getAddress())).wait();
  check('isAgent(agent) == true', (await wall.isAgent(await agent.getAddress())) === true);
  const tx = await wall.connect(agent).sign('gm from an AI agent');
  const rc = await tx.wait();
  check('holder sign() succeeds', rc.status === 1);
  check('noteCount == 1', (await wall.noteCount()) === 1n);
  check('uniqueSigners == 1', (await wall.uniqueSigners()) === 1n);
  check('hasSigned(agent) == true', (await wall.hasSigned(await agent.getAddress())) === true);

  // Second sign by same agent: notes grow, uniqueSigners stays 1
  await (await wall.connect(agent).sign('second note')).wait();
  check('noteCount == 2', (await wall.noteCount()) === 2n);
  check('uniqueSigners still 1', (await wall.uniqueSigners()) === 1n);

  // Over-long message reverts (>140 bytes)
  reverted = false;
  try { await wall.connect(agent).sign('x'.repeat(141)); } catch { reverted = true; }
  check('141-byte message reverts', reverted);

  // Empty message reverts
  reverted = false;
  try { await wall.connect(agent).sign(''); } catch { reverted = true; }
  check('empty message reverts', reverted);

  // latest() returns newest first
  const latest = await wall.latest(2);
  check('latest(2)[0] is second note', latest[0].message === 'second note');
  check('latest(2)[1] is first note', latest[1].message === 'gm from an AI agent');

  console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
