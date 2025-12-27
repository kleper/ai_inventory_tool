from sqlalchemy import create_engine, text

urls = [
    "postgresql://user:password@localhost:5432/smartinventory",
    "postgresql://user:user@localhost:5432/smartinventory",
    "postgresql://postgres:postgres@localhost:5432/smartinventory",
    "postgresql://postgres:password@localhost:5432/smartinventory",
    "postgresql://admin:admin@localhost:5432/smartinventory"
]

for url in urls:
    print(f"Testing URL: {url}")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            print(f"SUCCESS with {url}")
            break
    except Exception as e:
        print(f"Failed: {e}")
