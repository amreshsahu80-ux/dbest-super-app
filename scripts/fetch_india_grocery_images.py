#!/usr/bin/env python3
"""Fetch Indian packaged foods with actual front-pack images for DBest staging.
Only image-backed products enter the manifest. Never invent prices or availability.
"""
import json,urllib.request,urllib.parse,time,re
from pathlib import Path
UA="DBestSuperStagingCatalog/0.1 (https://dbest4u.com)"
OUT=Path("grocery-india-images.json")
FIELDS="code,product_name,brands,quantity,image_front_url,countries_tags,categories_tags"
def fetch(page):
    query=urllib.parse.urlencode({"countries_tags":"en:india","fields":FIELDS,"page_size":100,"page":page,"sort_by":"unique_scans_n"})
    req=urllib.request.Request("https://world.openfoodfacts.org/api/v2/search?"+query,headers={"User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=35) as resp:return json.load(resp)
def clean(s):return re.sub(r"\\s+"," ",str(s or "")).strip()
def main():
    items=[];seen=set();errors=[]
    for page in range(1,13):
        try: data=fetch(page)
        except Exception as e:
            errors.append("page "+str(page)+": "+str(e))
            if not items: raise
            break
        for p in data.get("products",[]):
            code=clean(p.get("code"));name=clean(p.get("product_name"));brand=clean(p.get("brands"));pack=clean(p.get("quantity"));url=p.get("image_front_url","")
            if not(code.isdigit() and 8<=len(code)<=14 and name and brand and pack and isinstance(url,str) and url.startswith("https://images.openfoodfacts.org/")):continue
            if code in seen:continue
            seen.add(code)
            items.append({"barcode":code,"name":name,"brand":brand,"pack":pack,"image_url":url,"source":"Open Food Facts","source_url":"https://world.openfoodfacts.org/product/"+code})
        if len(items)>=1000:break
        time.sleep(1.5)
    if not items:raise RuntimeError("No verified product images returned; preserving existing manifest")
    payload={"source":"Open Food Facts","license_data":"ODbL","license_images":"CC BY-SA","products":items[:1000],"errors":errors}
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print("Wrote",len(payload["products"]),"verified image-backed India product records")
if __name__=="__main__":main()
