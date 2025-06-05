const request = require('supertest');
const express = require('express');
const app = require('./index');

describe('Data Ingestion API Tests', () => {
    let ingestionId1;
    let ingestionId2;

    test('POST /ingest - Invalid input', async () => {
        const response = await request(app)
            .post('/ingest')
            .send({ ids: [], priority: 'HIGH' });
        expect(response.status).toBe(400);
    });

    test('POST /ingest - Valid input', async () => {
        const response = await request(app)
            .post('/ingest')
            .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ingestion_id');
        ingestionId1 = response.body.ingestion_id;
    });

    test('POST /ingest - Higher priority request', async () => {
        const response = await request(app)
            .post('/ingest')
            .send({ ids: [6, 7, 8, 9], priority: 'HIGH' });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ingestion_id');
        ingestionId2 = response.body.ingestion_id;
    });

    test('GET /status - Non-existent ingestion ID', async () => {
        const response = await request(app)
            .get('/status/nonexistent');
        expect(response.status).toBe(404);
    });

    test('GET /status - Valid ingestion ID', async () => {
        const response = await request(app)
            .get(`/status/${ingestionId1}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ingestion_id', ingestionId1);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('batches');
    });

    test('Priority and Rate Limit Verification', async () => {
        // Wait for some processing to occur
        await new Promise(resolve => setTimeout(resolve, 6000));

        const response1 = await request(app)
            .get(`/status/${ingestionId1}`);
        const response2 = await request(app)
            .get(`/status/${ingestionId2}`);

        // Verify that HIGH priority request is being processed first
        const highPriorityBatches = response2.body.batches;
        const mediumPriorityBatches = response1.body.batches;

        // Check if any HIGH priority batch is in 'triggered' or 'completed' state
        const highPriorityProcessing = highPriorityBatches.some(
            batch => batch.status === 'triggered' || batch.status === 'completed'
        );

        // Check if any MEDIUM priority batch is in 'triggered' or 'completed' state
        const mediumPriorityProcessing = mediumPriorityBatches.some(
            batch => batch.status === 'triggered' || batch.status === 'completed'
        );

        // If HIGH priority is processing, MEDIUM priority should not be processing
        if (highPriorityProcessing) {
            expect(mediumPriorityProcessing).toBe(false);
        }
    });

    test('Batch Size Verification', async () => {
        const response = await request(app)
            .get(`/status/${ingestionId1}`);
        
        // Verify that no batch has more than 3 IDs
        response.body.batches.forEach(batch => {
            expect(batch.ids.length).toBeLessThanOrEqual(3);
        });
    });

    test('Status Enum Verification', async () => {
        const response = await request(app)
            .get(`/status/${ingestionId1}`);
        
        const validStatuses = ['yet_to_start', 'triggered', 'completed'];
        
        // Verify that all batch statuses are valid
        response.body.batches.forEach(batch => {
            expect(validStatuses).toContain(batch.status);
        });
        
        // Verify that overall status is valid
        expect(validStatuses).toContain(response.body.status);
    });
}); 