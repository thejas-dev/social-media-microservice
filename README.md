# Social Media Microservice

## Overview
This project is a social media microservice architecture built using Express.js. It follows a distributed approach where each service handles a specific function. The API Gateway acts as the single entry point, managing requests and validating JWT tokens. The system is containerized using Docker and uses RabbitMQ for event-driven communication.

## Architecture
The microservice architecture consists of the following services:

### 1. **API Gateway**
   - Acts as the entry point for the microservices.
   - Uses `express-http-proxy` to route requests to respective services.
   - Validates JWT tokens for all requests except those directed to the **Identity Service**.

### 2. **Identity Service**
   - Manages user authentication and data storage in MongoDB.
   - Generates **access** and **refresh tokens** using JWT.
   - Provides login and registration functionalities.

### 3. **Post Service**
   - Handles the creation and retrieval of posts.
   - Validates request body parameters using `Joi` (npm package).
   - Stores post data in MongoDB.
   - Publishes an event to **RabbitMQ** when a post is deleted.

### 4. **Media Service**
   - Handles media uploads for posts.
   - Uploads media files to **Cloudinary** and generates a unique ID.
   - Deletes media associated with posts when receiving a deletion event from **Post Service** via RabbitMQ.

### 5. **Search Service**
   - Enables searching for posts.
   - Stores only textual content of posts (excluding media).
   - Listens for create/delete events from **Post Service** and updates search index accordingly.

## Technology Stack
- **Backend Framework**: Express.js
- **Database**: MongoDB (each service has its own MongoDB instance)
- **Caching**: Redis (each service has its own Redis instance)
- **Authentication**: JWT (JSON Web Tokens)
- **Event Bus**: RabbitMQ
- **API Gateway**: Express with `express-http-proxy`
- **Media Storage**: Cloudinary
- **Containerization & Orchestration**: Docker & Docker Compose

## Installation and Setup
### Prerequisites
- **Docker** and **Docker Compose** installed.
- **MongoDB** and **Redis** (can be run inside Docker).
- **RabbitMQ** (can be run inside Docker).

### Steps to Run the Microservices
1. Clone the repository:
   ```bash
   git clone https://github.com/thejas-dev/social-media-microservice
   cd social-media-microservice
   ```
2. Ensure that **Cloudinary API keys** and **JWT secret keys** are set in the environment files (`.env`).
3. Start all services using Docker Compose:
   ```bash
   docker-compose up --build
   ```
4. API Gateway will be accessible at `http://localhost:3000`

## Environment Variables
Each service requires its own `.env` file. Sample .env file is inside each microservices:


## API Endpoints
### Identity Service
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/login` - User login
- `POST /v1/auth/refresh-token` - Refresh token
- `POST /v1/auth/logout` - Logout

### Post Service
- `POST /v1/posts/create-post` - Create a new post
- `GET /v1/posts/all-posts` - Get All Posts
- `GET /v1/posts/:id` - Retrieve a post by ID
- `DELETE /v1/posts/:id` - Delete a post

### Media Service
- `POST /v1/media/upload` - Upload media
- `GET /v1/media/getAll` - Get all medias

### Search Service
- `GET /v1/search/posts?query=<query>` - Search posts

## Event Communication
- **Post Service → RabbitMQ (Post Deleted Event) → Media Service** (Deletes related media)
- **Post Service → RabbitMQ (Post Created/Deleted) → Search Service** (Updates search index)

## Deployment
To deploy services separately, each microservice has its own `Dockerfile`. You can build and push images individually or deploy via Kubernetes.

## Contributors
- Thejas Hari (@thejas-dev)

## License
This project is licensed under the MIT License.

