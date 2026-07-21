
export function getGroupByDate(dt: string) {
    const date = new Date(dt);
    let today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() || 7) + 1);
    today = new Date(monday.toISOString().split('T')[0]);
  
    // Calculate week difference
    const weekDiff = Math.floor(
      (date.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    return weekDiff;
  }
  
  export function getColorByWeekDiff(weekDiff: number) {
    if (weekDiff === 0) return '#00c874';
    else if (weekDiff === 1) return '#f7c605';
    else if (weekDiff < 0) return '#e2435c';
    else return '#00c874';
  }
  
  export const WEEK_DATES = getWeekDates();
  // Function to get week dates based on today
  function getWeekDates() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
    // Get Monday of current week
    // If current day is Sunday (0), we need to go back 6 days to get to last Monday
    // If current day is Monday (1), we stay on the same day
    // For all other days, we go back (currentDay - 1) days to get to Monday
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
  
    // Get Monday of previous week
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
  
    // Get Monday of next week
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
  
    return {
      previousWeek: prevMonday.toISOString().split('T')[0],
      thisWeek: monday.toISOString().split('T')[0],
      nextWeek: nextMonday.toISOString().split('T')[0],
    };
  }
  