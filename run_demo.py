import requests
import time

insert_url = "http://localhost:3000/model/start/"

# Start Demo...
response = requests.post(insert_url)

time.sleep(30.0)

insert_url = "http://localhost:3000/model/stop/"

# Stop Demo...
response = requests.post(insert_url)
