import { fetch } from 'undici';
import { describe, it, } from 'vitest';
import { Agent } from 'http';
import fetchNode from 'node-fetch';
import { request } from 'undici';
import https from 'https';

// Create an HTTP agent with keep-alive enabled
const keepAliveAgent = new Agent({
    keepAlive: false,
});

keepAliveAgent.on('free', (socket) => {
    console.log('Connection reused');
});

keepAliveAgent.on('connect', (socket) => {
    console.log('New connection created');
});

const agent = new https.Agent({
    rejectUnauthorized: false, // Ignore SSL certificate errors
});

function generateRandomLabelHash() {
    const hexChars = '0123456789abcdef';
    let labelHash = '0x';
    for (let i = 0; i < 64; i++) {
        labelHash += hexChars[Math.floor(Math.random() * 16)];
    }
    return labelHash;
}

async function measureLatency(url, iterations) {
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const labelHash = generateRandomLabelHash();
        const response = await fetch(`${url}/v1/heal/${labelHash}`, {
            method: 'GET',
        });
        const data = await response.text();

        const end = performance.now();
        const timeTaken = end - start;
        totalTime += timeTaken;
    }

    const averageTime = totalTime / iterations;
    console.log(`Undici Fetch Average time: ${averageTime} ms`);
}

async function measureLatencyNodeFetch(url, iterations) {
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const labelHash = generateRandomLabelHash();
        const response = await fetchNode(`${url}/v1/heal/${labelHash}`, {
            method: 'GET',
        });
        const data = await response.text();
            
        const end = performance.now();
        const timeTaken = end - start;
        totalTime += timeTaken;
    }

    const averageTime = totalTime / iterations;
    console.log(`Node-Fetch Average time: ${averageTime} ms`);
}

async function measureLatencyUndiciRequest(url, iterations) {
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const labelHash = generateRandomLabelHash();
        const { body, headers } = await request(`${url}/v1/heal/${labelHash}`, {
            method: 'GET',
        });
        const data = await body.text();

        const end = performance.now();
        const timeTaken = end - start;
        totalTime += timeTaken;
    }

    const averageTime = totalTime / iterations;
    console.log(`Undici Request Average time: ${averageTime} ms`);
}



describe('measureLatency', () => {
    it('should measure latency for the given URL', async () => {
        const url = 'http://localhost:3223'; // Base URL
        const iterations = 1000; // Number of times to fetch the URL

        await measureLatency(url, iterations);
    });
});

describe('measureLatencyNodeFetch', () => {
    it('should measure latency for the given URL using node-fetch', async () => {
        const url = 'http://localhost:3223'; // Base URL
        const iterations = 1000; // Number of times to fetch the URL

        await measureLatencyNodeFetch(url, iterations);
    });
});

describe('measureLatencyUndiciRequest', () => {
    it('should measure latency for the given URL using undici request', async () => {
        const url = 'http://localhost:3223'; // Base URL
        const iterations = 1000; // Number of times to fetch the URL

        await measureLatencyUndiciRequest(url, iterations);
    });
});
