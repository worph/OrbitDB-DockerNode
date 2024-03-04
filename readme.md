# OrbitDB Node in Docker

This repository contains a Docker setup for running an OrbitDB node using Node.js. OrbitDB is a serverless, distributed, peer-to-peer database. It uses IPFS as its data storage and libp2p for the network layer.

## Overview

The project is structured to build and run in a Docker environment, ensuring a seamless setup and deployment process. It utilizes a two-stage Docker build process to create a lightweight, production-ready image.

### Features

- **Dockerized Environment**: Easy to build and deploy.
- **OrbitDB Integration**: Utilizes OrbitDB for distributed database management.
- **Libp2p Configuration**: Custom libp2p configuration for peer-to-peer communication.
- **Environment Variables**: Configurable settings via environment variables, including support for multi-node setups using the `BOOTSTRAP` variable to connect nodes together.

## Prerequisites

- Docker
- Docker Compose (optional for managing multi-container Docker applications)
- Node.js environment (for local development)

## Getting Started

1. **Clone the Repository**

```
git clone <repository-url>
cd <repository-directory>
```

2. **Build the Docker Image**

```
docker build -t orbitdb-node .
```

3. **Run the Container Using Docker Compose**

   Below is an example `docker-compose.yml` file to run the OrbitDB node:

   ```yaml
   version: '3.8'
   services:
     orbit-db:
       image: rg.fr-par.scw.cloud/aptero/orbit-db:latest
       ports:
         - "4001:4001"
       environment:
         DB_NAME: "test123"
         DB_TYPE: "keyvalue"
         PORT: "4001"
         HOST: "51.159.100.53"
         BOOTSTRAP: "/ip4/51.159.100.53/tcp/4001/p2p/QmYourPeerId" # Use when connecting nodes together
       volumes:
         - "./keystore:/app/keystore"
         - "./peer-id.json:/app/peer-id.json"
       restart: unless-stopped
   ```

Adjust the `BOOTSTRAP` environment variable as necessary to include the multi-address of your bootstrap node(s) for connecting multiple nodes together.

4. **Start the Service**

   ```
   docker-compose up -d
   ```

## Configuration

The application can be configured via environment variables. Here are some of the key environment variables:

- `DB_NAME`: Name of the OrbitDB database.
- `DB_TYPE`: Type of the database (e.g., `keyvalue`, `feed`, `docstore`).
- `PORT`: The port on which the node listens.
- `HOST`: Host address for the node.
- `BOOTSTRAP`: Bootstrap nodes for the libp2p network. Use this variable to specify peers for connecting nodes together in a multi-node setup.

## Development

For local development, you can follow the Docker build steps or set up your environment to run the Node.js application directly. Ensure you have all dependencies installed:

```
yarn install
```

And then build and start the application:

```
yarn run build
node dist/
```

## Testing

(Optional) To run tests, ensure you have the testing environment set up and execute:

```
yarn test
```

## Contributing

Contributions are welcome! Please read the contributing guidelines before starting any work.

## License

This project is licensed under the MIT License - see the LICENSE file for details.