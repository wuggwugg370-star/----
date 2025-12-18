from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# 初始化数据库插件
db = SQLAlchemy()

# 1. 用户表 (管理员)
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

# 2. 菜品表
class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), default='其他')
    image = db.Column(db.String(500), nullable=True)
    is_available = db.Column(db.Boolean, default=True) # 上下架状态

    def to_dict(self):
        return {
            "name": self.name,
            "price": self.price,
            "category": self.category,
            "image": self.image,
            "available": self.is_available
        }

# 3. 订单表
class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    total_price = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='pending') # pending=待制作, done=已完成
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 关联订单详情
    items = db.relationship('OrderItem', backref='order', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "total": self.total_price,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "items": [item.to_dict() for item in self.items]
        }

# 4. 订单详情表 (记录每个订单买了什么)
class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False) 
    quantity = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {
            "name": self.product_name,
            "price": self.price,
            "quantity": self.quantity
        }