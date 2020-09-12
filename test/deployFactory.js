const { Harmony } = require("@harmony-js/core");
const hmy = new Harmony("https://api.s0.b.hmny.io", { chainType: "hmy", chainId: 2 });

let factory = require("./contracts/BFactory.json");
let opts    = { data: factory.bytecode };
let gas     = { gasPrice: 1000000000, gasLimit: 6721900 };

console.log('Deploying factory...');
let contract = hmy.contracts.createContract(factory.abi);
contract.wallet.addByPrivateKey(process.env.PRIVATEKEY);
contract.methods.contractConstructor(opts).send(gas).then(response => {
    if (response.transaction.txStatus == "REJECTED") {
        console.log('Factory rejected', response);
    } else {
        console.log('Factory deployed at', response.transaction.receipt.contractAddress);
    }
    process.exit(0);
});
