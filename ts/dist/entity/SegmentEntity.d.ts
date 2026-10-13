import { ResendEntityBase } from '../ResendEntityBase';
import type { ResendSDK } from '../ResendSDK';
import type { Control } from '../types';
import type { Segment, SegmentLoadMatch, SegmentListMatch, SegmentCreateData, SegmentUpdateData, SegmentRemoveMatch } from '../ResendTypes';
declare class SegmentEntity extends ResendEntityBase<Segment> {
    constructor(client: ResendSDK, entopts: any);
    make(this: SegmentEntity): SegmentEntity;
    load(this: any, reqmatch?: SegmentLoadMatch, ctrl?: Control): Promise<SegmentEntity>;
    list(this: any, reqmatch?: SegmentListMatch, ctrl?: Control): Promise<SegmentEntity[]>;
    create(this: any, reqdata?: SegmentCreateData, ctrl?: Control): Promise<SegmentEntity>;
    update(this: any, reqdata?: SegmentUpdateData, ctrl?: Control): Promise<SegmentEntity>;
    remove(this: any, reqmatch?: SegmentRemoveMatch, ctrl?: Control): Promise<SegmentEntity>;
}
export { SegmentEntity };
