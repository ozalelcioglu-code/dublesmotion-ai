export type GameType='halay'|'mountain'|'race'|'tawaf';
export type PilgrimGender='female'|'male';
export type Player={id:string;name:string;team:number;power:number;joinedAt:number;avatarUrl?:string;gender?:PilgrimGender};
export type GameEvent={id:string;kind:'join'|'like'|'gift';name:string;at:number};
export const starterNames=['Kuzey','Deniz','Aras','Mira','Lara','Efe','Dilan','Baran','Rojin'];
