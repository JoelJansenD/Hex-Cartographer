/**
 * Available tool groups/categories:
 * - 'text': Text annotation tool
 * - 'colour-picker': Pick colour tool
 * - 'pattern': Stamp pattern tool
 * - 'pattern-picker': Pick pattern tool
 * - 'river': River drawing tool
 * - 'road': Road drawing tool
 * - 'select-path': Select path tool
 * - 'border': Border drawing tool
 * - 'select-border': Select border tool
 */
export type ToolGroup = 'text' | 'colour-picker' | 'pattern' | 'pattern-picker' | 'river' | 'road' | 'select-path' | 'border' | 'select-border';

/**
 * Available tool groups/categories:
 * - 'brush': Paint tool
 * - 'bucket': Bucket fill tool
 * - 'eraser': Eraser tool
 */
export type PaintMode = 'brush' | 'bucket' | 'eraser';