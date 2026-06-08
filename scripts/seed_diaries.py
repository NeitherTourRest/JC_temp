"""Insert 50 travel diary entries into MongoDB (仿小红书风格)"""
import pymongo, datetime, random

client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["journeycraft"]
diaries = db["diaries"]

# Clear existing test diaries (keep ones with userId=1 from testing)
diaries.delete_many({"userId": {"$ne": 1}})

spots_names = [
    "十三陵", "居庸关长城", "蟒山国家森林公园", "温都水城", "中国航空博物馆",
    "银山塔林", "沙河水库", "北航沙河校区", "中财沙河校区", "昌平公园",
    "大杨山森林公园", "白虎涧自然风景区", "双龙山森林公园", "昌平博物馆", "北京后花园景区",
    "昌平新城滨河公园", "小汤山温泉度假村", "延寿寺", "静之湖度假村", "昌平农业嘉年华"
]

templates = [
    # (title, content_template)
    ("{}一日游攻略", "周末和朋友一起去了{}，真的超出预期！\n\n🚗 交通：从市区开车大约1小时，停车方便\n🎫 门票：价格合理，性价比高\n📸 拍照：随处都是风景，特别出片\n\n推荐指数：⭐⭐⭐⭐⭐\n\n小贴士：建议早点去，人少体验好"),
    ("{} | 北京周末好去处", "发现一个宝藏景点——{}！\n\n一直想找周末能去的地方，这次终于找到了。\n环境非常好，空气清新，适合放松心情。\n\n🍃 自然环境：⭐⭐⭐⭐⭐\n💰 消费：人均100左右\n🕐 建议游玩时间：3-4小时\n\n已经开始期待下次再来了！"),
    ("打卡{}🌿攻略分享", "终于来{}打卡啦！\n\n🎫 门票：提前在网上买便宜一些\n🚶 游览路线：推荐从东门进→主景区→西门出\n🍜 周边美食：门口有小吃街\n\n📌 实用Tips：\n1. 穿舒适的鞋子\n2. 带够水\n3. 做好防晒\n\n祝大家玩得开心～"),
    ("{}超详细攻略 | 避坑指南", "刚从{}回来，整理了超详细攻略！\n\n❌ 避坑：\n1. 节假日人巨多，建议工作日去\n2. 门口拉客的别信\n3. 里面的餐厅性价比一般\n\n✅ 推荐：\n1. 必看景点：主景区、观景台\n2. 最佳拍照时间：下午3-5点\n3. 附近美食推荐\n\n收藏这份攻略，下次去不迷路！"),
    ("北京{}｜秋日限定美景", "秋天的{}美得太不真实了！\n\n🍁 红叶遍山，层林尽染\n📸 随手一拍都是大片\n🌤️ 天气凉爽，非常适合出游\n\n和朋友一起去的，大家都被美景震撼到了。\n拍了超多照片，九宫格都不够发！\n\n明年秋天还要来！"),
    ("{}探店笔记📝", "今天来{}探店啦！\n\n整体评价：四星推荐⭐⭐⭐⭐\n\n🌟 亮点：\n- 景色独特，别处看不到\n- 设施完善，配套齐全\n- 工作人员态度好\n\n💫 不足：\n- 稍微有点远\n- 节假日人多\n\n总体还是很值得一去的！"),
    ("周末去哪儿｜{}", "推荐一个周末好去处——{}！\n\n🌞 天气好的时候去真的太舒服了\n👫 适合情侣/闺蜜/家庭出游\n📷 拍照超出片，建议带上相机\n\n🚇 交通攻略：\n- 自驾：导航直接到\n- 公交：坐345路到昌平转车\n- 地铁：昌平线到终点站\n\n赶紧收藏起来吧！"),
    ("{}｜遛娃好去处", "发现一个带娃好去处——{}！\n\n👶 亲子友好度：⭐⭐⭐⭐⭐\n\n设施齐全，有儿童活动区\n停车方便，推车没问题\n有餐厅，解决午饭问题\n\n孩子玩得特别开心，一直说还要来！\n\n推荐给所有宝爸宝妈～"),
    ("{}｜情侣约会圣地", "强烈推荐情侣约会去{}！\n\n氛围感满满，太适合约会了💕\n\n🌅 傍晚去看日落，浪漫满分\n📸 到处都可以拍情侣照\n🍽️ 附近有不错的餐厅\n\n两个人花销不大，体验很好。\n已经加入我们的约会清单了！"),
    ("毕业旅行｜{}", "毕业旅行选择了{}，太值得了！\n\n🎓 和室友们一起的最后一趟旅行\n📸 拍了好多合照\n😭 玩得很开心但也有点舍不得\n\n感谢{}给我们留下的美好回忆！\n\n祝大家前程似锦！✨"),
]

now = datetime.datetime.now()
entries = []
for i in range(50):
    spot = random.choice(spots_names)
    t = random.choice(templates)
    title = t[0].format(spot)
    content = t[1].format(spot) if "{}一日游攻略" not in t[0] or "{content}" not in t[1] else t[1].format(spot, spot)
    # Actually just format with spot
    content = t[1].format(spot, spot)
    
    # Random date within the last 3 months
    days_ago = random.randint(0, 90)
    date = now - datetime.timedelta(days=days_ago)
    
    entries.append({
        "userId": random.choice([2, 3, 4, 5, 6, 7, 8, 9, 10]),
        "title": title,
        "content": content,
        "destination": spot,
        "spotId": spots_names.index(spot) + 1 if spot in spots_names else None,
        "images": [],
        "popularity": random.randint(10, 500),
        "avgRating": round(random.uniform(3.0, 5.0), 1),
        "ratingCount": random.randint(1, 50),
        "isPublic": True,
        "createdAt": date,
        "updatedAt": date
    })

diaries.insert_many(entries)
print(f"Inserted {len(entries)} diary entries into MongoDB")
