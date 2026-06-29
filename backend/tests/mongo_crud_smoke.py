import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv('.env')
uri = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'cluster0')

print('URI_OK', bool(uri))
print('DB_OK', bool(db_name))

async def main():
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    test_collection = db['copilot_crud_test']

    await test_collection.delete_many({})

    result = await test_collection.insert_one({'test': True, 'value': 'hello', 'count': 1})
    print('INSERTED_ID', result.inserted_id)

    found = await test_collection.find_one({'_id': result.inserted_id})
    print('FOUND', found)

    await test_collection.update_one({'_id': result.inserted_id}, {'$set': {'count': 2}})
    updated = await test_collection.find_one({'_id': result.inserted_id})
    print('UPDATED', updated)

    await test_collection.delete_one({'_id': result.inserted_id})
    deleted = await test_collection.find_one({'_id': result.inserted_id})
    print('DELETED', deleted)

    client.close()

asyncio.run(main())
