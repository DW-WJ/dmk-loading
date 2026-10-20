import type { Directive } from 'vue';
import type { LoadingOptions } from '../core/types';
type Value = boolean | LoadingOptions | null | undefined;
export declare const vLoading: Directive<HTMLElement, Value>;
export default vLoading;
