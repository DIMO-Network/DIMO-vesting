# DIMO Vesting
Vesting contract for DIMO tokens

## How to run

You can execute the following commands to build the project and run additional scripts:

```sh
# Installs dependencies
npm i

# Clears cache, compiles contracts and generates typechain files
npm run build
```

You can deploy the contract running the following script, where `network_name` is one of the networks available in [hardhat.config.ts](./hardhat.config.ts):

```sh
npx hardhat run scripts/deploy.ts --network '<network_name>'
```

You can also verify contracts in etherscan/polygonscan/etc running the following command. Remove `<constructor_arguments>` if there isn't any.

```sh
npx hardhat verify '<deployed_contract_address>' '<constructor_arguments>' --network '<network_name>'

# Use this flag to specify the contract implementation if needed
npx hardhat verify '<deployed_contract_address>' '<constructor_arguments>' --network '<network_name>' --contract '<contract_path>:<contract_name>'
```

## Testing

You can run the test suite with the following commands:

```sh
# Runs test suite
npm run test

# Runs solidity coverage
npm run coverage
```