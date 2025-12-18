from app import app, db
from models import User, Product
from werkzeug.security import generate_password_hash

# 原始菜单数据
DEFAULT_MENU = {
    "宫保鸡丁": {"price": 28.0, "category": "中式经典"},
    "鱼香肉丝": {"price": 24.0, "category": "中式经典"},
    "麻婆豆腐": {"price": 22.0, "category": "中式经典"},
    "米饭": {"price": 3.0, "category": "中式经典"},
    "澳洲M5牛排": {"price": 128.0, "category": "西式料理"},
    "黑松露意面": {"price": 58.0, "category": "西式料理"},
    "凯撒沙拉": {"price": 32.0, "category": "西式料理"},
    "奶油蘑菇汤": {"price": 28.0, "category": "西式料理"},
    "冬阴功汤": {"price": 45.0, "category": "东南亚风味"},
    "泰式咖喱蟹": {"price": 168.0, "category": "东南亚风味"},
    "海南鸡饭": {"price": 35.0, "category": "东南亚风味"},
    "越式春卷": {"price": 26.0, "category": "东南亚风味"},
    "冰美式": {"price": 15.0, "category": "饮品甜点"},
    "提拉米苏": {"price": 25.0, "category": "饮品甜点"},
    "手作酸奶": {"price": 18.0, "category": "饮品甜点"}
}

def init_data():
    with app.app_context():
        # 1. 创建所有表
        db.create_all()
        print(">>> 数据库表结构已创建")

        # 2. 创建管理员 (账号admin, 密码admin123)
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin', 
                password_hash=generate_password_hash('admin123')
            )
            db.session.add(admin)
            print(">>> 管理员账号已创建: admin / admin123")

        # 3. 导入菜单
        count = 0
        for name, info in DEFAULT_MENU.items():
            if not Product.query.filter_by(name=name).first():
                p = Product(name=name, price=info['price'], category=info['category'])
                db.session.add(p)
                count += 1
        
        db.session.commit()
        print(f">>> 成功导入 {count} 个菜品数据！")

if __name__ == '__main__':
    init_data()