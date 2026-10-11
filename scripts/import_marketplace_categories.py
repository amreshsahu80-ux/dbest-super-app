#!/usr/bin/env python3
"""Stage category CSV data from public sources for DBest review, NOT automatic sale.
No prices from sources are used as vendor prices. No medicine is purchasable.
"""
import csv,io,json,urllib.request,re
from pathlib import Path
HEAD={"User-Agent":"DBestSuperStaging/0.1 (catalogue review; https://dbest4u.com)"}
def download(url,limit=24000000):
    with urllib.request.urlopen(urllib.request.Request(url,headers=HEAD),timeout=70) as r:
        body=r.read(limit+1)
    if len(body)>limit:raise RuntimeError("CSV too large")
    return body.decode("utf-8-sig")
def write(name,products,source,notice):
    Path(name).write_text(json.dumps({"source":source,"status":"review_only","notice":notice,"products":products},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(name,len(products))
def restaurant():
    url="https://raw.githubusercontent.com/War004/food-eaten-in-india/main/recipes.csv"
    rows=list(csv.DictReader(io.StringIO(download(url))))
    out=[]
    for row in rows:
        name=(row.get("Recipe Name English") or "").strip()
        if not name:continue
        nonveg=str(row.get("Is Non Veg","")).lower() in ("true","1","yes")
        out.append({"name":name,"category":"Non-Vegetarian" if nonveg else "Vegetarian","image_url":None,"price":None,"stock":None,"source_url":url})
    write("restaurant-india-catalog.json",out,"War004/food-eaten-in-india","Unverified recipe labels; no licensed dish images. Vendor must approve dish and supply price/photo before sale.")
def medicines():
    url="https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.csv"
    # Avoid downloading an unbounded data set; cap review staging to first 3000 records.
    with urllib.request.urlopen(urllib.request.Request(url,headers=HEAD),timeout=90) as r:
        lines=[]
        for i,line in enumerate(r):
            if i>3000:break
            lines.append(line.decode("utf-8",errors="replace"))
    rows=csv.DictReader(io.StringIO("".join(lines)))
    out=[]
    for row in rows:
        name=(row.get("name") or "").strip()
        if not name:continue
        out.append({"name":name,"brand":row.get("manufacturer_name",""),"pack":row.get("pack_size_label",""),"composition":row.get("short_composition1",""),"image_url":None,"price":None,"prescription_status":"requires_pharmacist_review","source_url":url})
    write("medicine-india-catalog-review.json",out,"junioralive/Indian-Medicine-Dataset","Research-only; provenance, approvals, schedule, strength, licence, pricing and prescription requirements must be independently checked. Never show as orderable.")
def grocery_openmrp():
    url="https://api.openmrp.in/v1/dump/file/products.csv"
    raw=download(url,18000000)
    rows=csv.DictReader(io.StringIO(raw))
    out=[]
    for row in rows:
        norm={k.lower().strip():v for k,v in row.items() if k}
        def pick(*names):return next((norm[n] for n in names if norm.get(n)),"")
        name=pick("name","product_name","name_en")
        brand=pick("brand","brand_name")
        image=pick("image_url","image","front_image_url")
        if not name or not brand:continue
        out.append({"name":name,"brand":brand,"pack":pick("pack_size","quantity","size"),"barcode":pick("barcode","ean","code"),"image_url":image if image.startswith("https://") else None,"price":None,"source_url":"https://openmrp.in"})
        if len(out)>=10000:break
    write("grocery-openmrp-review.json",out,"OpenMRP","Open data requires ODbL attribution/share-alike; images separately CC BY-SA; vendor prices must be supplied independently.")
if __name__=="__main__":
    for fn in (medicines,grocery_openmrp):
        try:fn()
        except Exception as e:print("SOURCE_UNAVAILABLE",fn.__name__,str(e))
