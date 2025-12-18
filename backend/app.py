import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from models import db, User, Product, Order, OrderItem

# === 配置 ===
BASE_DIR = Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

# 数据库配置: 用户名root, 密码123456, 端口3306, 库名neodining
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:123456@localhost:3306/neodining'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'my-graduation-secret' # 用于加密Token

CORS(app)
db.init_app(app)
jwt = JWTManager(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# === 路由接口 ===

@app.route("/")
def index():
    if (STATIC_DIR / "index.html").exists():
        return send_from_directory(STATIC_DIR, "index.html")
    return "Backend is Running with MySQL!", 200

# 1. 获取菜单 (从数据库查)
@app.route("/api/menu", methods=["GET"])
def get_menu():
    products = Product.query.filter_by(is_available=True).all()
    # 转换成前端需要的格式
    data = {p.name: p.to_dict() for p in products}
    return jsonify({"code": 200, "data": data})

# 2. 提交订单 (写入数据库)
@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.json or {}
    item_names = data.get("items", [])
    
    if not item_names:
        return jsonify({"code": 400, "msg": "购物车为空"}), 400

    # 统计数量
    from collections import Counter
    counts = Counter(item_names)

    try:
        new_order = Order()
        db.session.add(new_order)
        db.session.flush() # 先生成订单ID

        total_price = 0.0
        for name, qty in counts.items():
            product = Product.query.filter_by(name=name).first()
            if product:
                item_total = product.price * qty
                total_price += item_total
                # 添加详情
                order_item = OrderItem(order_id=new_order.id, product_name=name, price=product.price, quantity=qty)
                db.session.add(order_item)

        new_order.total_price = total_price
        db.session.commit()
        
        logging.info(f"Order Created: {new_order.id} | Total: {total_price}")
        return jsonify({"code": 200, "msg": "下单成功", "data": {"total": total_price}})
    
    except Exception as e:
        db.session.rollback()
        logging.error(e)
        return jsonify({"code": 500, "msg": "服务器错误"}), 500

# 3. 管理员登录 (新增)
@app.route("/api/auth/login", methods=["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")
    user = User.query.filter_by(username=username).first()
    
    # 验证密码
    if user and check_password_hash(user.password_hash, password):
        token = create_access_token(identity=username)
        return jsonify({"code": 200, "token": token})
    
    return jsonify({"code": 401, "msg": "登录失败"}), 401

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)