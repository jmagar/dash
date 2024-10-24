from dotenv import load_dotenv
import os
import requests
from flask import Flask, render_template, jsonify, Response, request, send_from_directory
import logging
from logging.handlers import RotatingFileHandler
import yaml
import glob
from functools import wraps
import docker
import json
import subprocess
from pathlib import Path
import re
from typing import Dict, List, Optional, Any
from datetime import datetime
import websockets
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor

# Create necessary directories
Path('logs').mkdir(exist_ok=True)
Path('static/css').mkdir(exist_ok=True, parents=True)
Path('static/js/modules').mkdir(exist_ok=True, parents=True)
Path('templates/components').mkdir(exist_ok=True, parents=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add file handler for logging
file_handler = RotatingFileHandler(
    'logs/dashboard.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=5
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

# Load environment variables from .env file
try:
    load_dotenv()
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.error(f"Failed to load .env file: {e}")
    raise

# Initialize Flask app with static file handling
app = Flask(__name__,
    static_url_path='/static',
    static_folder='static'
)

# Enable CORS for WebSocket connections
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Previous app.py content remains unchanged after this point
