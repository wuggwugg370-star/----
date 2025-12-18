import json
import logging
import os
from pathlib import Path
from threading import Lock
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# === 1. 基础配置 ===
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
BASE_DIR = Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
MENU_FILE = DATA_DIR / "menu_data.json"

# 确保数据目录存在
if not DATA_DIR.exists():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.config['JSON_AS_ASCII'] = False  # 允许返回中文
CORS(app)

# === 2. 数据管理核心 (简化版) ===
# 默认菜单数据 (写死在代码里作为兜底)
DEFAULT_MENU = {
    "宫保鸡丁": {"price": 28.0, "category": "中式经典", "image": ""},
    "澳洲M5牛排": {"price": 128.0, "category": "西式料理", "image": ""},
    "冰美式": {"price": 15.0, "category": "饮品甜点", "image": ""}
}

# 全局数据容器
server_state = {
    "menu": {},
    "lock": Lock()
}

def load_data():
    """强制加载数据，如果失败直接使用默认值"""
    loaded = False
    if MENU_FILE.exists():
        try:
            with open(MENU_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and len(data) > 0:
                    server_state["menu"] = data
                    loaded = True
                    logging.info("✅ 成功从文件加载菜单")
        except Exception as e:
            logging.warning(f"⚠️ 读取文件失败: {e}")
    
    if not loaded:
        logging.info("♻️ 初始化默认菜单...")
        server_state["menu"] = DEFAULT_MENU.copy()
        save_data()

def save_data():
    """保存数据到硬盘"""
    try:
        with server_state["lock"]:
            # 写临时文件防止损坏
            temp_file = MENU_FILE.with_suffix(".tmp")
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(server_state["menu"], f, ensure_ascii=False, indent=2)
            
            # 原子替换
            if os.path.exists(MENU_FILE):
                os.replace(temp_file, MENU_FILE)
            else:
                os.rename(temp_file, MENU_FILE)
            logging.info("💾 菜单已保存")
    except Exception as e:
        logging.error(f"❌ 保存失败: {e}")

# 启动时立即加载数据
load_data()

# === 3. 路由接口 ===
@app.route("/")
def index():
    # 优先检查 index.html 是否存在
    if (STATIC_DIR / "index.html").exists():
        return send_from_directory(STATIC_DIR, "index.html")
    # 如果不存在，说明前端没编译成功
    return """
    <div style="text-align:center; padding:50px;">
        <h1>Backend is Running ✅</h1>
        <p style="color:red;">But Frontend is missing!</p>
        <p>Please run 'npm run build' in the frontend folder.</p>
        <hr>
        <h3>Debug Info:</h3>
        <p>Static Dir: {}</p>
    </div>
    """.format(STATIC_DIR), 200

@app.route("/api/menu", methods=["GET"])
def get_menu():
    # 再次检查，防止运行时数据丢失
    if not server_state["menu"]:
        load_data()
    return jsonify({"code": 200, "data": server_state["menu"]})

@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.json or {}
    items = data.get("items", [])
    if not items: return jsonify({"code": 400, "msg": "购物车为空"}), 400
    
    total = 0.0
    menu = server_state["menu"]
    
    with server_state["lock"]:
        for name in items:
            if name in menu:
                total += menu[name]["price"]
    
    logging.info(f"收到订单: {len(items)} items | 总价: {total}")
    return jsonify({"code": 200, "msg": "下单成功", "data": {"total": total}})

# 管理员相关
@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.json or {}
    if data.get("password") == "admin123":
        return jsonify({"code": 200, "msg": "登录成功"})
    return jsonify({"code": 401, "msg": "密码错误"}), 401

@app.route("/api/admin/item", methods=["POST"])
def save_item():
    data = request.json or {}
    name = data.get("name")
    if not name: return jsonify({"code": 400, "msg": "缺少名称"}), 400

    with server_state["lock"]:
        server_state["menu"][name] = {
            "price": float(data.get("price", 0)),
            "category": data.get("category", "其他"),
            "image": data.get("image", "")
        }
        save_data()
    
    return jsonify({"code": 200, "msg": "保存成功"})

if __name__ == "__main__":
    logging.info("🚀 后端服务启动中...")
    logging.info(f"📁 静态文件目录: {STATIC_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=True)