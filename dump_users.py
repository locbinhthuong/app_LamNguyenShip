from pymongo import MongoClient
import certifi

try:
    client = MongoClient('mongodb+srv://LamNguyen:NTL123456@cluster0.zoxsh.mongodb.net/NTL_BinhThuong?retryWrites=true&w=majority', tlsCAFile=certifi.where())
    db = client.get_database()
    users = list(db.users.find())
    for u in users:
        print(f"User {u.get('phone')} / {u.get('fullName')}: FCM: {u.get('fcmToken')}")
except Exception as e:
    print('Error:', e)
