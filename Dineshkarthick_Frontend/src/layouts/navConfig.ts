import type { Role } from '../types';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  roles: Role[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon, roles: ['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] },
  { label: 'Upload', path: '/upload', icon: UploadFileOutlinedIcon, roles: ['ADMIN', 'IO', 'FORENSIC'] },
  { label: 'Documents', path: '/documents', icon: SearchOutlinedIcon, roles: ['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] },
  { label: 'Cases', path: '/cases', icon: FolderOutlinedIcon, roles: ['ADMIN', 'IO', 'JUDGE'] },
  { label: 'Audit & Compliance', path: '/audit', icon: AssessmentOutlinedIcon, roles: ['ADMIN', 'JUDGE'] },
  { label: 'Users & Roles', path: '/admin/users', icon: GroupOutlinedIcon, roles: ['ADMIN'] },
];

export function navForRole(role: Role): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
