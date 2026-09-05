import gzip,json,collections,sys
E=json.load(gzip.open(sys.argv[1]))['traceEvents'];click=next(x['ts'] for x in E if x['name']=='EventDispatch' and x['args'].get('data',{}).get('type')=='click');nodes={};samples=[];t=next(x['args']['data']['startTime'] for x in E if x['name']=='Profile')
for e in E:
 if e['name']!='ProfileChunk':continue
 d=e['args']['data'];p=d.get('cpuProfile',{});nodes.update({n['id']:n for n in p.get('nodes',[])})
 for n,dt in zip(p.get('samples',[]),d.get('timeDeltas',[])):t+=dt;samples.append((t,n,dt))
def name(n):
 f=nodes.get(n,{}).get('callFrame',{});return f.get('functionName','?')+' '+f.get('url','').split('/')[-1]+':'+str(f.get('lineNumber',0)+1)
def summarize(a,b):
 own=collections.Counter();inc=collections.Counter()
 for t,n,dt in samples:
  if not a<=t<b:continue
  own[name(n)]+=dt
  seen=set()
  while n and n not in seen:
   seen.add(n);inc[name(n)]+=dt;n=nodes.get(n,{}).get('parent')
 return {'self':[(k,round(v/1000,2)) for k,v in own.most_common(16)],'inclusive':[(k,round(v/1000,2)) for k,v in inc.most_common(20)]}
for label,a,b in [('ignition',0,1.15),('intro',1.15,9),('zoom',9,12),('menu',12,15)]:
 print(label,json.dumps(summarize(click+a*1e6,click+b*1e6)))
for e in E:
 if e['name']=='FunctionCall' and e.get('dur',0)>15000 and e['args'].get('data',{}).get('functionName')=='animate':
  print('HITCH',round((e['ts']-click)/1e6,3),e['dur']/1000,json.dumps(summarize(e['ts'],e['ts']+e['dur'])))
for name_ in ['RunTask','GPUTask','Layout','UpdateLayoutTree','Paint','MinorGC','MajorGC']:
 ev=[x for x in E if x['name']==name_ and x.get('ph')=='X' and x['ts']>=click];print(name_,len(ev),'sum ms',sum(x.get('dur',0) for x in ev)/1000,'max ms',max([x.get('dur',0) for x in ev] or [0])/1000)
