

import Path from 'node:path'
import * as Fs from 'node:fs'

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert'
import { createLiveTransport } from '../../live-runner'
import { runLiveEntity } from '../../live-entity'


import { ResendSDK, BaseFeature, config, stdutil } from '../../..'

import {
  envOverride,
  liveClientOptions,
  liveDelay,
  loadEnvLocal,
  makeCtrl,
  makeMatch,
  makeReqdata,
  makeStepData,
  makeValid,
  maybeSkipControl,
} from '../../utility'


loadEnvLocal(__dirname + '/../../../.env.local')


describe('SegmentEntity', async () => {

  // Per-test live pacing. Delay is read from sdk-test-control.json's
  // `test.live.delayMs`; only sleeps when RESEND_TEST_LIVE=TRUE.
  afterEach(liveDelay('RESEND_TEST_LIVE'))

  test('instance', async () => {
    const testsdk = ResendSDK.test()
    const ent = testsdk.Segment()
    assert(null != ent)
  })


  class FailHook extends BaseFeature {
    name = 'failhook'
    version = '0.0.1'
    active = true
    unexpected = 0
    init() { }
    PreSpec() { throw new Error('segment hook failed') }
    PreUnexpected() { this.unexpected++ }
  }

  test('stream-error', async () => {
    const offline = { net: { offline: true } }
    await assert.rejects(async () => {
      for await (const _item of ResendSDK.test(offline).Segment().stream('list')) { }
    }, /offline/)

    for await (const _item of ResendSDK.test(offline).Segment()
      .stream('list', undefined, { ctrl: { throw: false } })) { }

    if (null != (config as any).feature?.rbac) {
      const denied = ResendSDK.test(undefined, { feature: { rbac: { active: true, deny: true } } })
      await assert.rejects(async () => {
        for await (const _item of denied.Segment().stream('list')) { }
      }, (err: any) => 'rbac_denied' === err.code)
    }
  })

  test('stream-ctrl', async () => {
    const explain: any = {}
    const ctrl: any = { explain }
    for await (const _item of ResendSDK.test().Segment().stream('list', undefined, { ctrl })) { }
    assert.deepStrictEqual(Object.keys(ctrl), ['explain'])
    assert(explain === ctrl.explain && 0 < Object.keys(explain).length)
  })

  test('unexpected', async () => {
    const hook = new FailHook()
    const client = new ResendSDK({ feature: { test: { active: true } }, extend: [hook] })
    await assert.rejects(client.Segment().list(), /hook failed/)
    assert(0 < hook.unexpected)

    const fired = hook.unexpected
    assert.strictEqual(await client.Segment().list(undefined, { throw: false }), undefined)
    assert(fired < hook.unexpected)
  })

  test('validate', async (t) => {
    if (null == (config as any).feature?.validate) {
      t.skip('feature not present in this SDK: validate')
      return
    }
    const client = ResendSDK.test(undefined, { feature: { validate: { active: true } } })
    await assert.rejects(client.Segment().list({"after":1} as any),
      (err: any) => 'validate_failed' === err.code)
  })



  test('basic', async (t) => {

    const live = 'TRUE' === process.env.RESEND_TEST_LIVE
    for (const op of ['create', 'list', 'update', 'load', 'remove']) {
      if (!live && maybeSkipControl(t, 'entityOp', 'segment.' + op, live)) return
    }

    
    const setup = basicSetup()
    if (setup.live) {
      return runLiveEntity(setup, {"active":true,"alias":{"field":{}},"fields":{"audience_id":{"a":true,"de":true,"h":"Audience Id","n":"audience_id","r":false,"sh":"The ID of the audience this segment belongs to.","t":"`$STRING`","key$":"audience_id","index$":0},"created_at":{"a":true,"h":"Created At","n":"created_at","r":false,"sh":"Timestamp indicating when the segment was created.","t":"`$STRING`","key$":"created_at","index$":1},"filter":{"a":true,"h":"Filter","n":"filter","r":false,"sh":"Filter conditions for the segment.","t":"`$OBJECT`","key$":"filter","index$":2},"id":{"a":true,"h":"Id","n":"id","r":false,"sh":"The ID of the segment.","t":"`$STRING`","key$":"id","index$":3},"name":{"a":true,"h":"Name","n":"name","op":{"create":{"req":true,"type":"`$STRING`"},"update":{"req":true,"type":"`$STRING`"}},"r":false,"sh":"The name of the segment.","t":"`$STRING`","key$":"name","index$":4},"object":{"a":true,"h":"Object","n":"object","r":false,"sh":"The object type.","t":"`$STRING`","key$":"object","index$":5}},"id":{"field":"id","name":"id"},"name":"segment","op":{"create":{"input":"data","name":"create","points":[{"a":true,"bf":["audience_id","filter","name"],"co":{"id":"POST /segments","source":"openapi3","version":2},"g":{},"k":"http","m":"POST","o":"/segments","q":{},"r":{},"rs":{"kind":"json","media":"application/json"},"s":[{"lit":"segments"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":0}],"key$":"create"},"list":{"input":"data","name":"list","points":[{"a":true,"co":{"id":"GET /segments","source":"openapi3","version":2},"g":{"query":[{"a":true,"k":"query","n":"after","or":"after","r":false,"t":"`$STRING`","index$":0},{"a":true,"k":"query","n":"before","or":"before","r":false,"t":"`$STRING`","index$":1},{"a":true,"k":"query","n":"limit","or":"limit","r":false,"t":"`$INTEGER`","index$":2}]},"k":"http","m":"GET","o":"/segments","q":{},"r":{},"rs":{"kind":"json","media":"application/json"},"s":[{"lit":"segments"}],"t":{"req":"`reqdata`","res":"`body.data`"},"index$":0}],"key$":"list"},"load":{"input":"data","name":"load","points":[{"a":true,"co":{"id":"GET /segments/{id}","source":"openapi3","version":2},"g":{"params":[{"a":true,"k":"param","n":"id","or":"id","r":true,"t":"`$STRING`","index$":0}]},"k":"http","m":"GET","o":"/segments/{id}","q":{"exist":["id"]},"r":{},"rs":{"kind":"json","media":"application/json"},"s":[{"lit":"segments"},{"var":"id"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":0}],"key$":"load"},"remove":{"input":"data","name":"remove","points":[{"a":true,"co":{"id":"DELETE /segments/{id}","source":"openapi3","version":2},"g":{"params":[{"a":true,"k":"param","n":"id","or":"id","r":true,"t":"`$STRING`","index$":0}]},"k":"http","m":"DELETE","o":"/segments/{id}","q":{"exist":["id"]},"r":{},"rs":{"kind":"json","media":"application/json"},"s":[{"lit":"segments"},{"var":"id"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":0}],"key$":"remove"},"update":{"input":"data","name":"update","points":[{"a":true,"bf":["name"],"co":{"id":"PATCH /segments/{id}","source":"openapi3","version":2},"g":{"params":[{"a":true,"k":"param","n":"id","or":"id","r":true,"t":"`$STRING`","index$":0}]},"k":"http","m":"PATCH","o":"/segments/{id}","q":{"exist":["id"]},"r":{},"rs":{"kind":"json","media":"application/json"},"s":[{"lit":"segments"},{"var":"id"}],"t":{"req":"`reqdata`","res":"`body`"},"index$":0}],"key$":"update"}},"relations":{"ancestors":[]},"key$":"segment","name__orig":"segment","Name":"Segment","name_":"segment","name-":"segment","NAME":"SEGMENT","index$":42}, {"active":true,"entity":"segment","key$":"BasicSegmentFlow","kind":"basic","name":"BasicSegmentFlow","param":{},"step":[{"a":true,"d":{},"i":{"ref":"segment_ref01"},"m":{},"o":"create","s":[],"v":[]},{"a":true,"d":{},"i":{},"m":{},"o":"list","s":[],"v":[{"apply":"ItemExists","def":{"ref":"segment_ref01"}}]},{"a":true,"d":{},"i":{"ref":"segment_ref01","srcdatavar":"segment_ref01_data","suffix":"_up0","textfield":"audience_id"},"m":{},"o":"update","s":[{"apply":"TextFieldMark","def":{"mark":"Mark01-segment_ref01"}}],"v":[]},{"a":true,"d":{},"i":{"ref":"segment_ref01","srcdatavar":"segment_ref01_data","suffix":"_dt0"},"m":{"id":"segment01"},"o":"load","s":[],"v":[{"apply":"TextFieldMark","def":{"mark":"Mark01-segment_ref01"}}]},{"a":true,"d":{},"i":{"ref":"segment_ref01","suffix":"_rm0"},"m":{"id":"segment01"},"o":"remove","s":[],"v":[]},{"a":true,"d":{},"i":{"suffix":"_rt0"},"m":{},"o":"list","s":[],"v":[{"apply":"ItemNotExists","def":{"ref":"segment_ref01"}}]}]}, 'Segment', {"POST /segments":{"protocol":"http","requestBody":{"content":{"application/json":{"schema":{"type":"object","required":["name"],"properties":{"name":{"type":"string","description":"The name of the segment.","key$":"name"},"audience_id":{"type":"string","description":"The ID of the audience this segment belongs to.","deprecated":true,"key$":"audience_id"},"filter":{"type":"object","description":"Filter conditions for the segment.","key$":"filter"}},"x-ref":"#/components/schemas/CreateSegmentOptions","index$":1}}}},"parameters":[]},"GET /segments":{"protocol":"http","parameters":[{"in":"query","name":"limit","required":false,"schema":{"type":"integer","minimum":1,"maximum":100},"description":"Number of items to return.","x-ref":"#/components/parameters/PaginationLimit","index$":0},{"in":"query","name":"after","required":false,"schema":{"type":"string"},"description":"Return items after this cursor.","x-ref":"#/components/parameters/PaginationAfter","index$":1},{"in":"query","name":"before","required":false,"schema":{"type":"string"},"description":"Return items before this cursor.","x-ref":"#/components/parameters/PaginationBefore","index$":2}]},"GET /segments/{id}":{"protocol":"http","parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string"},"description":"The Segment ID.","index$":0}]},"DELETE /segments/{id}":{"protocol":"http","parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string"},"description":"The Segment ID.","index$":0}]},"PATCH /segments/{id}":{"protocol":"http","requestBody":{"content":{"application/json":{"schema":{"type":"object","required":["name"],"properties":{"name":{"type":"string","description":"The name of the segment.","key$":"name"}},"x-ref":"#/components/schemas/UpdateSegmentOptions","index$":1}}}},"parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string"},"description":"The Segment ID.","index$":0}]}}, { strict: LIVE_STRICT, t })
    }
    const client = setup.client
    const struct = setup.struct

    const isempty = struct.isempty
    const select = struct.select


    // CREATE
    const segment_ref01_ent = client.Segment()
    let segment_ref01_data = setup.data.new.segment['segment_ref01']

    segment_ref01_data = (await segment_ref01_ent.create(segment_ref01_data)).data()
    assert(null != segment_ref01_data.id)


    // LIST
    const segment_ref01_match: any = {}

    const segment_ref01_list = (await segment_ref01_ent.list(segment_ref01_match)).map((e: any) => e.data())

    assert(!isempty(select(segment_ref01_list, { id: segment_ref01_data.id })))


    // UPDATE
    const segment_ref01_data_up0: any = {}
    segment_ref01_data_up0.id = segment_ref01_data.id

    const segment_ref01_markdef_up0 = { name: 'audience_id', value: 'Mark01-segment_ref01_' + setup.now }
    ;(segment_ref01_data_up0 as any)[segment_ref01_markdef_up0.name] = segment_ref01_markdef_up0.value

    const segment_ref01_resdata_up0 = (await segment_ref01_ent.update(segment_ref01_data_up0)).data()
    assert(segment_ref01_resdata_up0.id === segment_ref01_data_up0.id)

    assert((segment_ref01_resdata_up0 as any)[segment_ref01_markdef_up0.name] === segment_ref01_markdef_up0.value)


    // LOAD
    const segment_ref01_match_dt0: any = {}
    segment_ref01_match_dt0.id = segment_ref01_data.id
    const segment_ref01_data_dt0 = (await segment_ref01_ent.load(segment_ref01_match_dt0)).data()
    assert(segment_ref01_data_dt0.id === segment_ref01_data.id)


    // REMOVE
    const segment_ref01_match_rm0: any = { id: segment_ref01_data.id }
    await segment_ref01_ent.remove(segment_ref01_match_rm0)
  

    // LIST
    const segment_ref01_match_rt0: any = {}

    const segment_ref01_list_rt0 = (await segment_ref01_ent.list(segment_ref01_match_rt0)).map((e: any) => e.data())

    assert(isempty(select(segment_ref01_list_rt0, { id: segment_ref01_data.id })))


  })
})



// main.kit.test.live.strict is true (the default is true): a live
// request that fails, or a live test missing an input it needs,
// fails the test.
// An account with no record for a test to read skips it either way.
const LIVE_STRICT = true

function basicSetup(extra?: any) {
  // TODO: fix test def options
  const options: any = {} // null

  // TODO: needs test utility to resolve path
  const entityDataFile =
    Path.resolve(__dirname, 
      '../../../../.sdk/test/entity/segment/SegmentTestData.json')

  // TODO: file ready util needed?
  const entityDataSource = Fs.readFileSync(entityDataFile).toString('utf8')

  // TODO: need a xlang JSON parse utility in voxgig/struct with better error msgs
  const entityData = JSON.parse(entityDataSource)

  options.entity = entityData.existing

  let client = ResendSDK.test(options, extra)
  const struct = client.utility().struct
  const merge = struct.merge
  const transform = struct.transform

  let idmap = transform(
    ['segment01','segment02','segment03'],
    {
      '`$PACK`': ['', {
        '`$KEY`': '`$COPY`',
        '`$VAL`': ['`$FORMAT`', 'upper', '`$COPY`']
      }]
    })

  const env = envOverride({
    'RESEND_TEST_SEGMENT_ENTID': idmap,
    'RESEND_TEST_LIVE': 'FALSE',
    'RESEND_TEST_EXPLAIN': 'FALSE',
    'RESEND_APIKEY': '',
  })

  idmap = env['RESEND_TEST_SEGMENT_ENTID']

  const live = 'TRUE' === env.RESEND_TEST_LIVE

  const transport = createLiveTransport()
  if (live) {
    const rawIds = process.env['RESEND_TEST_SEGMENT_ENTID']
    idmap = rawIds && rawIds.trim() ? JSON.parse(rawIds) : {}
    if (!idmap || Array.isArray(idmap) || typeof idmap !== 'object') {
      throw new Error('Live ENTID must be a JSON object')
    }
    client = new ResendSDK(merge([
      // FIRST, so the generated fields below win: sdk-test-control.json's
      // test.client.options adds to the live client, it does not redirect it.
      liveClientOptions(),
      {
        apikey: env.RESEND_APIKEY,
      },
      // 'extra || {}', not a bare 'extra': struct.merge returns UNDEFINED when the
      // last entry is undefined, and basicSetup is normally called with no
      // argument at all - so a bare 'extra' silently discarded the apikey
      // and server values above and handed the SDK undefined. Harmless
      // while there was nothing in that object; not harmless now.
      extra || {},
      { system: { fetch: transport.fetch } }
    ]))
  }

  const setup = {
    idmap,
    env,
    options,
    client,
    struct,
    data: entityData,
    explain: 'TRUE' === env.RESEND_TEST_EXPLAIN,
    live,
    transport,
    now: Date.now(),
  }

  return setup
}
  
