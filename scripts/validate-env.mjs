#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const root = process.cwd();

const REQUIRED_ALWAYS = [];
const REQUIRED_STRICT = ['GOOGLE_GENERATIVE_AI_API_KEY'];
const GRAPH_KEYS = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MS_DRIVE_ID'];

function parseDotEnv(content) {
    const values = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const idx = trimmed.indexOf('=');
        if (idx <= 0) continue;

        const key = trimmed.slice(0, idx).trim();
        const raw = trimmed.slice(idx + 1).trim();
        const value = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        values[key] = value;
    }

    return values;
}

function readLocalEnv() {
    const merged = {};
    const candidates = ['.env', '.env.local'];

    for (const file of candidates) {
        const abs = path.join(root, file);
        if (fs.existsSync(abs)) {
            Object.assign(merged, parseDotEnv(fs.readFileSync(abs, 'utf8')));
        }
    }

    return merged;
}

function envValue(name, localEnv) {
    return process.env[name] || localEnv[name] || '';
}

const localEnv = readLocalEnv();
const requiredKeys = strict ? [...REQUIRED_ALWAYS, ...REQUIRED_STRICT] : REQUIRED_ALWAYS;
const missingRequired = requiredKeys.filter((key) => !envValue(key, localEnv));

const graphState = GRAPH_KEYS.map((key) => ({ key, value: envValue(key, localEnv) }));
const graphConfiguredCount = graphState.filter((entry) => Boolean(entry.value)).length;
const graphPartiallyConfigured = graphConfiguredCount > 0 && graphConfiguredCount < GRAPH_KEYS.length;

if (missingRequired.length > 0 || (strict && graphPartiallyConfigured)) {
    console.error('Environment validation failed.');

    if (missingRequired.length > 0) {
        console.error(`Missing required keys: ${missingRequired.join(', ')}`);
    }

    if (graphPartiallyConfigured) {
        const missingGraph = graphState
            .filter((entry) => !entry.value)
            .map((entry) => entry.key);
        console.error(`Cloud sync is partially configured. Missing: ${missingGraph.join(', ')}`);
    }

    process.exit(1);
}

console.log('Environment validation passed.');

if (!envValue('GOOGLE_GENERATIVE_AI_API_KEY', localEnv)) {
    console.log('Note: GOOGLE_GENERATIVE_AI_API_KEY is not set. AI routes will not function.');
}

if (graphConfiguredCount === 0) {
    console.log('Note: Microsoft Graph cloud sync keys are not set. OneDrive/SharePoint sync will be unavailable.');
} else if (graphPartiallyConfigured) {
    const missingGraph = graphState
        .filter((entry) => !entry.value)
        .map((entry) => entry.key);
    console.log(`Note: Cloud sync is partially configured. Missing: ${missingGraph.join(', ')}`);
}