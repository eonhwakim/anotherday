import { LinearGradient } from 'expo-linear-gradient';
export default function ScreenBackground({ children }: { children: React.ReactNode }) {
  const bg = gradients.background.primary;

  return (
    <LinearGradient
      colors={bg.colors as [string, string, string]}
      locations={bg.locations as [number, number, number]}
      start={bg.start}
      end={bg.end}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
}
export const gradients = {
  background: {
    primary: {
      // colors: ['#f8f1ec', '#faded2', '#ffa581', '#FF6B3D'],
      // locations: [0, 0.2, 0.4, 1],
      // colors: ['#e2f0f6', '#f6f6f6', '#f6f6f6', '#faded2'], //2순위
      // colors: ['#faded2', '#fdfcfb', '#e4e3e9', '#f8f1ec'],
      // colors: ['#F9B799', '#faded2', '#FCF1EB', '#F8F4F0'],
      // colors: ['#faded2', '#f6f6f6', '#f6f6f6', '#faded2'],
      colors: ['#f0f0f0', '#faded2'], //#f3ebe7 #E6DFDB
      locations: [0.95, 1],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    soft: {
      colors: ['#F9B799', '#FBD8C7', '#FCF1EB', '#F8F4F0'],
      locations: [0, 0.2, 0.45, 1],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
  },
};
