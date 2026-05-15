import requests

data = {
    "name": "Test",
    "mailing_name": "Test",
    "address_lane1": "Test",
    "city": "Test",
    "state_pincode": "Test",
    "mobile": "12345",
    "gstin": "22AAAAA0000A1Z5"
}

try:
    res = requests.post("http://127.0.0.1:8000/api/firms/", json=data)
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
