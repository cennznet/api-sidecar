# api-sidecar
CENNZnet sidecar provides an HTTP API and actively indexes database alongside a CENNZnet node 

# Run indexer process
yarn run:indexer

# Run API service
yarn api

# query test data
```bash
yarn seed && yarn api
curl localhost:3000/nftWallet/5FWizEtxJTb2wPjWEqtEDetYTjgmWRmUNvRpMBh6ZDX4JJCt
 ```


# Run NFT Data
1. run docker-compose up to start mysql service, 
2. run npx prisma db push  --schema=./src/api/config/schema.prisma (will create table EventTracker)
3. run redis-server to start redis service
4. run yarn nft:finalizationHead
5. run yarn nft:stats
6. run yarn api
    a. http://localhost:3000/nft/token/56/35/0 - end point to get history of an nft with collection id 56, series id 35 and serialNumber 0
    b. http://localhost:3000/nft/listing/653 - get all information history for a listing id
    c. http://localhost:3000/nft/wallet/5D2XVbob7zYjWzhkZ8nPcBgR7yEhAiXE5rYV8qhKdktrcHSq - get all the nft transaction with a wallet
