#!/bin/bash

# Starte den Message Processor
echo "Starte Message Processor..."
cd "$(dirname "$0")"
python3 message_processor.py
