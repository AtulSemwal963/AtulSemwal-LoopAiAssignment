//STEP 1: Importing required modules
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

//STEP 2: Allowing cross-origin requests to test the API from different origins
const app = express();

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

//STEP 3: As per the assignment's requirements, i.e Respect a rate limit of 1 batch per 5 second,we'll use some const variables to configure our rate limiter  
const BATCH_SIZE = 3;                    // Maximum number of IDs to process in one batch
const RATE_LIMIT_MS = 5000;             // Time to wait between processing batches (5 seconds)
const EXTERNAL_API_DELAY_MS = 1000;     // Simulated delay for external API calls (1 second)

//STEP 4: Creating a Priority enum as per the requirements of the assignment
const Priority = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
};

//STEP 5: We'll store our ingestion IDs in a Map, where the key is the batch ID and the value is an object containing the input batch
const ingestionStore = new Map();

//STEP 6: Setting up our processing queue and a flag to prevent multiple simultaneous processing
let processingQueue = [];    // Queue for batches waiting to be processed
let isProcessing = false;    // Flag to prevent multiple simultaneous processing

//STEP 7: Creating helper functions to simulate external API calls and process batches
/**
 * Simulates an external API call for processing an ID as per the assignment requirements
 * @param {number} id - The ID to process
 * @returns {Promise<Object>} - Simulated API response
 */
const simulateExternalAPICall = async (id) => {
    // Simulate network delay as per the assignment's requirement
    await new Promise(resolve => setTimeout(resolve, EXTERNAL_API_DELAY_MS));
    return { id, data: "processed" };
};

/**
 * Processes a single batch of IDs, respecting the batch size limit of 3
 * @param {Object} batch - The batch to process
 */
const processBatch = async (batch) => {
    // Mark batch as started
    batch.status = 'triggered';
    
    try {
        // Process each ID in the batch
        for (const id of batch.ids) {
            await simulateExternalAPICall(id);
        }
        // Mark batch as completed
        batch.status = 'completed';
    } catch (error) {
        console.error(`Error processing batch ${batch.batch_id}:`, error);
    }
};

/**
 * Processes the queue of batches with rate limiting of 1 batch per 5 seconds
 */
const processQueue = async () => {
    // Don't start if already processing or queue is empty
    if (isProcessing || processingQueue.length === 0) return;
    
    isProcessing = true;
    
    // Process batches one by one, respecting the rate limit
    while (processingQueue.length > 0) {
        const batch = processingQueue.shift();
        await processBatch(batch);
        // Wait for rate limit period before processing next batch
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }
    
    isProcessing = false;
};

//STEP 8: Creating our API endpoints as per the assignment requirements

/**
 * POST /ingest
 * Creates a new ingestion request and queues it for processing
 * Handles the input format: {ids: [1,2,3,4,5], priority: 'HIGH'}
 */
app.post('/ingest', (req, res) => {
    const { ids, priority } = req.body;
    
    // Log incoming request for debugging
    console.log('\n=== Incoming Ingestion Request ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    // Validate input as per the assignment requirements
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log('Error: Invalid ids array');
        return res.status(400).json({ error: 'Invalid ids array' });
    }
    if (!priority || !Object.values(Priority).includes(priority)) {
        console.log('Error: Invalid priority');
        return res.status(400).json({ error: 'Invalid priority' });
    }
    
    // Generate unique ID for this ingestion request
    const ingestion_id = uuidv4();
    
    // Split IDs into batches of maximum size 3 as per the assignment
    const batches = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = {
            batch_id: uuidv4(),
            ids: ids.slice(i, i + BATCH_SIZE),
            status: 'yet_to_start',
            priority,
            created_time: Date.now()
        };
        batches.push(batch);
    }
    
    // Store the ingestion request in our Map
    ingestionStore.set(ingestion_id, {
        ingestion_id,
        status: 'yet_to_start',
        batches
    });
    
    // Add batches to processing queue
    processingQueue.push(...batches);
    
    // Sort queue by priority and creation time as per the assignment requirements
    processingQueue.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.created_time - b.created_time;
    });
    
    // Start processing if not already running
    if (!isProcessing) {
        processQueue();
    }
    
    // Send response with the ingestion ID
    const response = { ingestion_id };
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('===============================\n');
    
    res.json(response);
});

/**
 * GET /status/:ingestion_id
 * Returns the current status of an ingestion request as per the assignment format
 */
app.get('/status/:ingestion_id', (req, res) => {
    const { ingestion_id } = req.params;
    
    // Log incoming request for debugging
    console.log('\n=== Status Check Request ===');
    console.log('Ingestion ID:', ingestion_id);
    
    // Get ingestion request from our storage
    const ingestion = ingestionStore.get(ingestion_id);
    
    if (!ingestion) {
        console.log('Error: Ingestion request not found');
        return res.status(404).json({ error: 'Ingestion request not found' });
    }
    
    // Calculate overall status based on batch statuses as per the assignment
    const statuses = ingestion.batches.map(batch => batch.status);
    let overallStatus = 'yet_to_start';
    
    if (statuses.some(status => status === 'triggered')) {
        overallStatus = 'triggered';
    } else if (statuses.every(status => status === 'completed')) {
        overallStatus = 'completed';
    }
    
    ingestion.status = overallStatus;
    
    // Send response in the required format
    console.log('Response:', JSON.stringify(ingestion, null, 2));
    console.log('===============================\n');
    
    res.json(ingestion);
});

//STEP 9: Starting our server on port 5000
const PORT = process.env.PORT || 5000;

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// For Vercel deployment
module.exports = app;
