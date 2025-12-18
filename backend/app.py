import logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from menu_store import MenuStore

# === 配置 ===
BASE_DIR = Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
MENU_FILE = DATA_DIR / "menu_data.json"

if not DATA_DIR.exists():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

# 默认菜单
DEFAULT_MENU = {
    "宫保鸡丁": {"price": 28.0, "category": "中式经典"},
    "澳洲M5牛排": {"price": 128.0, "category": "西式料理"},
    "冰美式": {"price": 15.0, "category": "饮品甜点"}
}

# === 初始化 ===
logging.basicConfig(level=logging.INFO)
app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
CORS(app)
store = MenuStore(MENU_FILE, DEFAULT_MENU)

# === 路由 ===
@app.route("/")
def index():
    if (STATIC_DIR / "index.html").exists():
        return send_from_directory(STATIC_DIR, "index.html")
    return "Backend running. Please run 'npm run build' in frontend.", 200

@app.route("/api/menu", methods=["GET"])
def get_menu():
    return jsonify({"code": 200, "data": store.get_menu()})

@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.json or {}
    items = data.get("items", [])
    if not items: return jsonify({"code": 400, "msg": "购物车为空"}), 400
    
    total, not_found, detail = store.calc_order(items)
    if not_found: return jsonify({"code": 400, "msg": f"缺货: {', '.join(not_found)}"}), 400

    logging.info(f"Order: {items} | Total: {total}")
    return jsonify({"code": 200, "msg": "下单成功", "data": {"total": total}})

# --- 管理员接口 ---
@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.json or {}
    # 简单写死密码用于毕设演示
    if data.get("password") == "admin123":
        return jsonify({"code": 200, "msg": "登录成功"})
    return jsonify({"code": 401, "msg": "密码错误"}), 401

@app.route("/api/admin/item", methods=["POST"])
def save_item():
    """新建或更新菜品"""
    data = request.json or {}
    name = data.get("name")
    
    if not name:
        return jsonify({"code": 400, "msg": "菜品名称不能为空"}), 400

    store.upsert_item(
        name=name,
        price=data.get("price"),     # 现在可以更新价格了
        category=data.get("category"), # 现在可以更新分类了
        image=data.get("image")
    )
    return jsonify({"code": 200, "msg": "保存成功"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)