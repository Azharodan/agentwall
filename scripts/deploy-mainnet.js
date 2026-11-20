// Deploy AgentWall to BNB Chain mainnet from the deployer EOA.
// Constructor arg: the official Agent ID registry (SPACE ID Agent ID).
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const AGENT_ID_REGISTRY = '0x60b9262456de011f7d15a54cdd8c48baaa8b022f';

(async () => {
  const key = fs.readFileSync(path.join(__dirname, '..', 'deployer-key.txt'), 'utf8').trim();
  const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
  const wallet = new ethers.Wallet(key, provider);
  console.log('deployer:', wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log('balance:', ethers.formatEther(bal), 'BNB');

  const art = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'AgentWall.json'), 'utf8'));
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, wallet);
  const contract = await factory.deploy(AGENT_ID_REGISTRY);
  const deployTx = contract.deploymentTransaction();
  console.log('deploy tx:', deployTx.hash);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  const rc = await provider.getTransactionReceipt(deployTx.hash);
  console.log('AgentWall deployed at:', addr);
  console.log('deploy status:', rc.status, 'gasUsed:', rc.gasUsed.toString(),
    'cost BNB:', ethers.formatEther(rc.gasUsed * rc.gasPrice));

  // Post-deploy verification against the live registry
  const registry = await contract.agentId();
  console.log('agentId() =', registry, registry.toLowerCase() === AGENT_ID_REGISTRY.toLowerCase() ? 'OK' : 'MISMATCH');
  console.log('isAgent(rodans wallet 0xdb5f...dc77) =', await contract.isAgent('0xdb5fb856ab993d53D30bDD459fd2932B88c0dc77'));
  console.log('isAgent(deployer) =', await contract.isAgent(wallet.address));
  console.log('noteCount =', (await contract.noteCount()).toString(), 'uniqueSigners =', (await contract.uniqueSigners()).toString());

  fs.writeFileSync(path.join(__dirname, '..', 'deployment.json'), JSON.stringify({
    contract: addr, deployTx: deployTx.hash, deployer: wallet.address,
    agentIdRegistry: AGENT_ID_REGISTRY, gasUsed: rc.gasUsed.toString(),
    costBNB: ethers.formatEther(rc.gasUsed * rc.gasPrice),
    block: rc.blockNumber, chain: 'bsc-mainnet-56',
  }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
