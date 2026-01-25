# AyahFinder

A comprehensive Quranic verse search and matching application with mobile and backend services.

## Project Structure

- **backend/** - Backend services for the application
  - **ml-service/** - Machine learning service for Quranic verse matching and search
- **mobile/** - Mobile application for end users
- **docs/** - Project documentation

## Getting Started

### Prerequisites

- Node.js (for mobile app)
- Python (for ML service)
- Required API keys and environment variables

### Installation

1. Clone the repository:
```bash
git clone https://github.com/IbrahimDoba/AyahFinder.git
cd AyahFinder
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in respective directories
   - Fill in your API keys and configuration

3. Install dependencies:

For mobile:
```bash
cd mobile
npm install
```

For ML service:
```bash
cd backend/ml-service
pip install -r requirements.txt
```

## Features

- Progressive matching system for Quranic verses
- Real-time search capabilities
- Mobile-friendly interface
- Machine learning-powered verse matching

## Documentation

Additional documentation can be found in the `/docs` directory and the following guides:
- Implementation Guide
- Pinecone Setup Guide
- Progressive Matching Guide
- Realtime Matching Implementation

## License

[Add your license here]

## Author

Ibrahim Doba
