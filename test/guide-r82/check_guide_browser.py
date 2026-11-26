#!/usr/bin/env python3
import pathlib,shutil
from playwright.sync_api import sync_playwright
R=pathlib.Path(__file__).resolve().parents[2]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1600,'height':1000})
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto((R/'index.html').as_uri(),wait_until='load')
 assert p.evaluate('LubricaBootOK===true')
 p.locator('[data-view="settings"]').click()
 p.locator('#openFullGuideCard').click()
 d=p.locator('#userGuideDialog')
 assert d.is_visible()
 ids=p.evaluate('LubricaUserGuide.chapters.map(c=>c.id)')
 assert len(ids)==18
 for id in ids:
  d.locator('[data-guide-chapter="'+id+'"]').click()
  assert 'R8.2' in d.locator('.user-guide-head h2').inner_text()
  p.wait_for_function("Array.from(document.querySelectorAll('#userGuideDialog .user-guide-shot img')).every(i=>i.complete&&i.naturalWidth>0)")
  assert d.locator('[data-guide-image]').count()>0
  first=d.locator('[data-guide-image]').first
  first.click()
  assert d.locator('[data-guide-lightbox]').evaluate("e=>e.classList.contains('open')")
  d.locator('[data-guide-lightbox-close]').click()
 d.locator('[data-guide-search]').fill('моточасы')
 p.wait_for_timeout(250)
 assert d.locator('[data-guide-chapter="route-settings"]').count()==1
 d.locator('[data-guide-search]').fill('')
 p.wait_for_timeout(250)
 d.locator('[data-guide-chapter="step7"]').click()
 d.locator('[data-guide-next]').click()
 assert 'Автоматические маршруты' in d.locator('.user-guide-chapter-head h3').inner_text()
 d.locator('[data-guide-open-view]').click()
 assert p.locator('#routes').is_visible() and not d.is_visible()
 assert not errors,errors
 b.close()
print('GUIDE BROWSER PASS: 18 chapters, image loading, zoom, search, next, open application view')
