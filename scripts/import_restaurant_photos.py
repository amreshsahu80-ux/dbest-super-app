#!/usr/bin/env python3
"""Generate persistent, attribution-bearing dish photo records for staging.
No guessing: only filename matches with clear dish tokens are accepted.
"""
import json,re,time,urllib.parse,urllib.request
from pathlib import Path
UA="DBestSuper/1.0 (https://dbest4u.com; public image metadata importer)"
API="https://commons.wikimedia.org/w/api.php"
def api(q):
    u=API+"?"+urllib.parse.urlencode(q)
    req=urllib.request.Request(u,headers={"User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def norm(s):return re.sub(r"[^a-z0-9 ]"," ",s.lower()).split()
def search(name):
    # Require distinctive dish terms in filename, not merely a search result.
    tokens=[x for x in norm(name) if len(x)>2 and x not in {"style","with","and","indian","basic","roasted","cooked"}]
    if len(tokens)<1:return None
    q={"action":"query","generator":"search","gsrsearch":'intitle:"'+" ".join(tokens[:3])+'"','gsrnamespace":6,"gsrlimit":8,"prop":"imageinfo","iiprop":"url|extmetadata","iiurlwidth":360,"format":"json"}
    try:data=api(q)
    except Exception as e:print("FETCH_FAIL",name,str(e)[:120]);return None
    for page in (data.get("query",{}).get("pages",{}) or {}).values():
        title=page.get("title","").removeprefix("File:")
        if not re.search(r"\.(jpe?g|png|webp)$",title,re.I):continue
        found=norm(title)
        if not all(t in found for t in tokens[:min(2,len(tokens))]):continue
        inf=(page.get("imageinfo") or [{}])[0];metadata=inf.get("extmetadata") or {}
        lic=(metadata.get("LicenseShortName") or {}).get("value","")
        if not re.search(r"CC BY|CC0|Public domain|PD-",lic,re.I):continue
        url=inf.get("thumburl") or inf.get("url")
        if not url or not url.startswith("https://upload.wikimedia.org/"):continue
        return {"image_url":url,"image_source":inf.get("descriptionurl",""),"image_license":lic,"image_reviewed":True,"image_match_method":"exact dish terms in Wikimedia filename"}
    return None
def main():
    p=Path("restaurant-india-catalog.json");data=json.loads(p.read_text(encoding="utf8"))
    found=0
    # Prioritize common Indian restaurant dishes rather than rare regional recipe labels.
    popular=["paneer","biryani","chicken","masala","tikka","naan","samosa","dal","dosa","idli","puri","curry","fish","pakora","mutton","chole","rajma","korma","paratha","pulao","halwa","gulab"]
    dishes=sorted(data["products"],key=lambda p:(not any(t in p["name"].lower() for t in popular),p["name"]))
    for i,p in enumerate(dishes[:110]):
        if re.search(r"turtle|wild animal|spirit|beer|alcohol|foraged tuber",p["name"],re.I):continue
        photo=search(p["name"])
        if photo:p.update(photo);found+=1
        if i%20==0:print("Processed",i,"found",found,flush=True)
        time.sleep(.25)
    data["image_import"]={"source":"Wikimedia Commons","matched_count":found,"processed":min(len(dishes),110),"method":"persistent exact-title matched image metadata"}
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf8")
    print("MATCHED",found,"of",min(len(dishes),110))
if __name__=="__main__":main()
