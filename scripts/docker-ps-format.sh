#!/bin/bash
docker ps --format "Name: {{.Names}}\nImage: {{.Image}}\nStatus: {{.Status}}\nPorts: {{.Ports}}\n---"