Requirements to deploy BFactory:
- Owner = Harmony address with testnet funds
- Owner's private key 
- $ export PRIVATEKEY={owners_private_key}
- $ npm install @harmony-js/core
- $ mkdir contracts
- Save BFactory.json to contracts folder
- Save deployFactory.js to current folder
- $ node deployFactory
- Result should be your Factory address
- Test factory methods like getBLabs, getColor, etc

Current Results:
- Factory contract created and address generated
- Check BFactory.sol for methods, inputs and outputs
- Errors on testing factory methods:
- On testing getColor (BRONZE) result not available
- On testing getBLabs(), collector (owner) not returned
- On testing setBLabs(owner): collector not set
- On testing newBPool(): pool not generated