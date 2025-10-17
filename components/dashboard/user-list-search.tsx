import React from "react";

interface UserListSearchProps {
  search: string;
  setSearch: (value: string) => void;
  onSearch?: (value: string) => void;
}

const UserListSearch: React.FC<UserListSearchProps> = ({
  search,
  setSearch,
  onSearch,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <input
      type="text"
      value={search}
      onChange={handleChange}
      placeholder="Search users by name or email..."
      className="w-full rounded-lg border border-gray-300 bg-white/20 px-4 py-2 text-white placeholder:text-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
    />
  );
};

export default UserListSearch;
