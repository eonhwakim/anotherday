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
      // locations: [0, 0.7, 0.9, 1],
      // colors: ['#b3b6be', '#bcbdc5', '#e4e3e9', '#f8f1ec'],
      // colors: ['#faded2', '#fdfcfb', '#e4e3e9', '#f8f1ec'],
      colors: ['#F9B799', '#faded2', '#FCF1EB', '#F8F4F0'],
      locations: [0, 0.14, 0.32, 1],
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
