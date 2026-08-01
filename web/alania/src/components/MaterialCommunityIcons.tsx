import {
  Apple,
  Baby,
  BadgeCheck,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  CloudSun,
  Drama,
  Dumbbell,
  Earth,
  FlaskConical,
  Gamepad2,
  Hand,
  HeartHandshake,
  Home,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  MonitorSmartphone,
  Music,
  Newspaper,
  Palette,
  PawPrint,
  Pencil,
  Rocket,
  Route,
  Scale,
  School,
  Shirt,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Trophy,
  Users,
  Utensils,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';

const icons = {
  apple: Apple,
  baby: Baby,
  badgeCheck: BadgeCheck,
  bookOpen: BookOpen,
  brain: Brain,
  briefcaseBusiness: BriefcaseBusiness,
  calendarDays: CalendarDays,
  clock: Clock3,
  cloudSun: CloudSun,
  drama: Drama,
  dumbbell: Dumbbell,
  earth: Earth,
  flask: FlaskConical,
  gamepad: Gamepad2,
  hand: Hand,
  heartHandshake: HeartHandshake,
  home: Home,
  landmark: Landmark,
  languages: Languages,
  leaf: Leaf,
  lightbulb: Lightbulb,
  monitorSmartphone: MonitorSmartphone,
  music: Music,
  newspaper: Newspaper,
  palette: Palette,
  paw: PawPrint,
  pencil: Pencil,
  rocket: Rocket,
  route: Route,
  scale: Scale,
  school: School,
  shirt: Shirt,
  shoppingCart: ShoppingCart,
  smartphone: Smartphone,
  smile: Smile,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  trophy: Trophy,
  users: Users,
  utensils: Utensils,
  volleyball: Volleyball,
} satisfies Record<string, LucideIcon>;

export type MaterialCommunityIconName = keyof typeof icons;

type Props = {
  name: MaterialCommunityIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean | 'true' | 'false';
};

export function MaterialCommunityIcons({
  name,
  size = 18,
  className,
  strokeWidth = 2,
  'aria-hidden': ariaHidden = true,
}: Props) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden={ariaHidden}
      className={className}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
