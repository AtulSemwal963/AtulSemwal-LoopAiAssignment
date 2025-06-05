# Data Ingestion API System

This is my implementation of the Data Ingestion API System assignment. The system handles data ingestion requests with priority-based processing and rate limiting, exactly as specified in the requirements.

## What I've Built

I've created a system that:
- Processes data ingestion requests asynchronously in batches
- Handles different priority levels (HIGH, MEDIUM, LOW) as per the assignment
- Respects the rate limit of 1 batch per 5 seconds
- Limits each batch to 3 IDs maximum
- Tracks the status of each ingestion request and its batches

## What You Need to Run This

Before running the application, make sure you have:
- Node.js (version 14 or higher) installed on your system
- npm (Node Package Manager) installed on your system

## How to Get Started

1. First, clone this repository to your local machine:
```bash
git clone <repository-url>
cd data-ingestion-api
```

2. Install all the required dependencies:
```bash
npm install
```

## Running the Application

To start the server, simply run:
```bash
npm start
```

The server will start running on port 5000. If you want to use a different port, you can set it using the PORT environment variable.

## Testing the Application

To run the test suite that I've created:
```bash
npm test
```

## How to Use the API

### 1. Submitting an Ingestion Request
- **Endpoint**: POST /ingest
- **What to Send**:
```json
{
    "ids": [1, 2, 3, 4, 5],
    "priority": "HIGH"
}
```
- **What You'll Get Back**:
```json
{
    "ingestion_id": "uuid-string"
}
```

### 2. Checking the Status
- **Endpoint**: GET /status/:ingestion_id
- **What You'll Get Back**:
```json
{
    "ingestion_id": "uuid-string",
    "status": "triggered",
    "batches": [
        {
            "batch_id": "uuid-string",
            "ids": [1, 2, 3],
            "status": "completed"
        },
        {
            "batch_id": "uuid-string",
            "ids": [4, 5],
            "status": "triggered"
        }
    ]
}
```

## How I Built This

1. **Storage Solution**: I used a Map to store ingestion requests and their statuses. In a real-world scenario, this would be replaced with a proper database.

2. **Processing Method**: I implemented asynchronous processing using async/await, with a queue system to handle multiple requests as per the assignment requirements.

3. **Priority Handling**: I created a priority-based queue that sorts requests based on their priority level and creation time, exactly as specified in the assignment.

4. **Rate Limiting**: I implemented the rate limiting using setTimeout to ensure we process only 1 batch per 5 seconds, as required.

5. **Batch Processing**: Each batch is limited to 3 IDs and is processed asynchronously, following the assignment specifications.

## Testing What I've Built

I've created comprehensive tests that verify:
- All input validation works correctly
- Priority-based processing functions as required
- Rate limiting is properly implemented
- Batch size constraints are respected
- Status tracking works accurately
- Error handling is robust

## Error Handling

The system handles various error cases:
- Invalid input validation (like empty ID arrays or invalid priorities)
- Requests for non-existent ingestion IDs
- Any processing errors that might occur

## Future Improvements

If I were to enhance this system further, I would:
1. Add a proper database for persistent storage
2. Implement user authentication and authorization
3. Add more comprehensive error handling
4. Add request validation middleware
5. Implement proper logging and monitoring
6. Add API documentation using Swagger/OpenAPI
