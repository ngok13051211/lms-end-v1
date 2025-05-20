// seed.ts
import { db } from "./index";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function seed() {
  try {
    console.log("Seeding database...");

    // Helper functions to generate realistic Vietnamese data
    const generateVietnameseName = (
      gender: "male" | "female" | null = null
    ) => {
      const maleFirstNames = [
        "Minh",
        "Hùng",
        "Đức",
        "Tuấn",
        "Nam",
        "Hoàng",
        "Long",
        "Thành",
        "Dũng",
        "Trung",
        "Quang",
        "Hải",
        "Khoa",
        "Tâm",
        "Phong",
        "Khải",
        "Vinh",
        "Hiếu",
        "Thắng",
        "Đạt",
        "Tùng",
        "Thanh",
        "Sơn",
        "Phúc",
        "Bảo",
        "Trí",
        "Tú",
        "Mạnh",
        "Tiến",
        "Lâm",
        "Việt",
        "Công",
        "Vũ",
      ];
      const femaleFirstNames = [
        "Hương",
        "Lan",
        "Linh",
        "Phương",
        "Thảo",
        "Hà",
        "Mai",
        "Trang",
        "Huyền",
        "Quỳnh",
        "Ngọc",
        "Nhung",
        "Yến",
        "Thu",
        "Hiền",
        "Hoa",
        "Hạnh",
        "Trâm",
        "Giang",
        "Vân",
        "Loan",
        "Thanh",
        "Thúy",
        "Ngân",
        "Diệp",
        "Mỹ",
        "Kim",
        "Chi",
        "Ánh",
        "Dung",
        "Đào",
      ];
      const middleNames = [
        "Thị",
        "Văn",
        "Đức",
        "Hữu",
        "Như",
        "Quang",
        "Minh",
        "Hoàng",
        "Thị Thanh",
        "Thị Hoài",
        "Văn Minh",
        "Đình",
        "Thị Thu",
        "Phương",
        "Thị Hồng",
        "Thị Mai",
        "Thị Ngọc",
        "Thị Hương",
        "Thị Lan",
        "Mạnh",
        "Thúy",
        "Tuấn",
        "Thu",
        "Thị Thủy",
        "",
      ];
      const lastNames = [
        "Nguyễn",
        "Trần",
        "Lê",
        "Phạm",
        "Hoàng",
        "Huỳnh",
        "Phan",
        "Vũ",
        "Võ",
        "Đặng",
        "Bùi",
        "Đỗ",
        "Hồ",
        "Ngô",
        "Dương",
        "Lý",
        "Đào",
        "Đinh",
        "Mai",
        "Trịnh",
        "Lương",
        "Phùng",
        "Tô",
        "Hà",
        "Cao",
        "Đoàn",
        "Lưu",
      ];

      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const middleName =
        middleNames[Math.floor(Math.random() * middleNames.length)];

      if (gender === "male") {
        const firstName =
          maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)];
        return { firstName, middleName, lastName };
      } else if (gender === "female") {
        const firstName =
          femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
        return { firstName, middleName, lastName };
      } else {
        const isMale = Math.random() > 0.5;
        const firstNameArray = isMale ? maleFirstNames : femaleFirstNames;
        const firstName =
          firstNameArray[Math.floor(Math.random() * firstNameArray.length)];
        return {
          firstName,
          middleName,
          lastName,
          gender: isMale ? "male" : "female",
        };
      }
    };

    const generateVietnameseAddress = () => {
      const cities = [
        "Hà Nội",
        "Thành phố Hồ Chí Minh",
        "Đà Nẵng",
        "Hải Phòng",
        "Cần Thơ",
        "Huế",
        "Nha Trang",
        "Hạ Long",
        "Vũng Tàu",
        "Đà Lạt",
        "Biên Hòa",
        "Buôn Ma Thuột",
        "Vinh",
        "Quy Nhơn",
        "Nam Định",
        "Long Xuyên",
        "Pleiku",
        "Thái Nguyên",
        "Hải Dương",
      ];

      const districts: Record<string, string[]> = {
        "Hà Nội": [
          "Hoàn Kiếm",
          "Ba Đình",
          "Đống Đa",
          "Hai Bà Trưng",
          "Hoàng Mai",
          "Thanh Xuân",
          "Tây Hồ",
          "Long Biên",
          "Nam Từ Liêm",
          "Bắc Từ Liêm",
          "Cầu Giấy",
        ],
        "Thành phố Hồ Chí Minh": [
          "Quận 1",
          "Quận 3",
          "Quận 4",
          "Quận 5",
          "Quận 6",
          "Quận 7",
          "Quận 8",
          "Quận 10",
          "Quận 11",
          "Quận 12",
          "Bình Thạnh",
          "Phú Nhuận",
          "Tân Bình",
          "Thủ Đức",
        ],
        "Đà Nẵng": [
          "Hải Châu",
          "Thanh Khê",
          "Liên Chiểu",
          "Ngũ Hành Sơn",
          "Sơn Trà",
          "Cẩm Lệ",
        ],
        "Hải Phòng": [
          "Hồng Bàng",
          "Lê Chân",
          "Ngô Quyền",
          "Kiến An",
          "Hải An",
          "Đồ Sơn",
          "Dương Kinh",
        ],
        "Cần Thơ": ["Ninh Kiều", "Bình Thủy", "Cái Răng", "Ô Môn", "Thốt Nốt"],
        Huế: ["Phú Nhuận", "Phú Hậu", "Vĩ Dạ", "An Cựu", "Xuân Phú"],
        "Nha Trang": [
          "Lộc Thọ",
          "Phương Sài",
          "Vĩnh Phước",
          "Vĩnh Hải",
          "Vĩnh Thọ",
          "Xương Huân",
        ],
        "Hạ Long": ["Hồng Hải", "Hà Tu", "Cao Thắng", "Hà Khẩu"],
        "Vũng Tàu": [
          "Phường 1",
          "Phường 2",
          "Phường 3",
          "Phường 4",
          "Thắng Nhất",
          "Thắng Nhì",
        ],
        "Đà Lạt": [
          "Phường 1",
          "Phường 2",
          "Phường 3",
          "Phường 4",
          "Phường 5",
          "Phường 6",
          "Phường 7",
          "Phường 8",
        ],
        "Biên Hòa": [
          "Tân Mai",
          "Quang Vinh",
          "Tân Tiến",
          "Tam Hiệp",
          "Trảng Dài",
        ],
        "Buôn Ma Thuột": [
          "Ea Tam",
          "Tân Lợi",
          "Tân An",
          "Tân Hòa",
          "Thống Nhất",
          "Thành Công",
        ],
        Vinh: [
          "Lê Lợi",
          "Quang Trung",
          "Trường Thi",
          "Hưng Bình",
          "Hưng Dũng",
          "Bến Thủy",
        ],
        "Quy Nhơn": [
          "Đống Đa",
          "Trần Phú",
          "Lê Lợi",
          "Ngô Mây",
          "Thị Nại",
          "Ghềnh Ráng",
        ],
        "Nam Định": [
          "Trần Tế Xương",
          "Lộc Vượng",
          "Phan Đình Phùng",
          "Bà Triệu",
          "Trần Đăng Ninh",
        ],
        "Long Xuyên": ["Mỹ Bình", "Mỹ Long", "Mỹ Xuyên", "Mỹ Quý", "Mỹ Phước"],
        Pleiku: [
          "Trà Bá",
          "Thắng Lợi",
          "Ia Kring",
          "Hội Thương",
          "Thống Nhất",
          "Yên Đổ",
        ],
        "Thái Nguyên": [
          "Trưng Vương",
          "Quang Trung",
          "Phan Đình Phùng",
          "Thịnh Đán",
          "Hoàng Văn Thụ",
          "Tân Thịnh",
        ],
        "Hải Dương": [
          "Trần Hưng Đạo",
          "Trần Phú",
          "Nguyễn Trãi",
          "Phạm Ngũ Lão",
          "Quang Trung",
          "Tân Bình",
        ],
      };

      const streets = [
        "Lê Duẩn",
        "Trần Phú",
        "Lê Lợi",
        "Nguyễn Huệ",
        "Nguyễn Thái Học",
        "Huỳnh Thúc Kháng",
        "Nguyễn Công Trứ",
        "Phan Chu Trinh",
        "Võ Văn Tần",
        "Lý Thường Kiệt",
        "Phan Đình Phùng",
        "Trần Hưng Đạo",
        "Đinh Công Tráng",
        "Nguyễn Đình Chiểu",
        "Nguyễn Trãi",
        "Hai Bà Trưng",
        "Ngô Quyền",
        "Hoàng Diệu",
        "Bạch Đằng",
        "Nguyễn Thị Minh Khai",
        "Điện Biên Phủ",
        "Trần Quốc Toản",
        "Lê Văn Sỹ",
        "Phạm Văn Đồng",
        "Cách Mạng Tháng Tám",
      ];

      const randomStreetNumbers = Math.floor(Math.random() * 200) + 1;
      const city = cities[Math.floor(Math.random() * cities.length)];
      const district =
        districts[city][Math.floor(Math.random() * districts[city].length)];
      const street = streets[Math.floor(Math.random() * streets.length)];

      return `${randomStreetNumbers} ${street}, ${district}, ${city}`;
    };

    const generateVietnamesePhoneNumber = () => {
      const prefixes = [
        "086",
        "096",
        "097",
        "098",
        "032",
        "033",
        "034",
        "035",
        "036",
        "037",
        "038",
        "039",
        "090",
        "091",
        "092",
        "093",
        "094",
        "070",
        "079",
        "077",
        "076",
        "078",
        "089",
        "088",
        "083",
        "084",
        "085",
        "081",
        "082",
      ];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      let number = "";
      for (let i = 0; i < 7; i++) {
        number += Math.floor(Math.random() * 10);
      }
      return prefix + number;
    };

    const generateVietnameseEmail = (
      firstName: string,
      lastName: string
    ): string => {
      const providers = [
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "homitutor.vn",
      ];
      const provider = providers[Math.floor(Math.random() * providers.length)];

      // Convert Vietnamese characters to non-accented
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
          .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
          .replace(/ì|í|ị|ỉ|ĩ/g, "i")
          .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
          .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
          .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
          .replace(/đ/g, "d")
          .replace(/\s+/g, "");
      };

      const normalizedFirstName = normalizeText(firstName);
      const normalizedLastName = normalizeText(lastName);

      // Different email formats
      const formats = [
        `${normalizedFirstName}${normalizedLastName}@${provider}`,
        `${normalizedFirstName}.${normalizedLastName}@${provider}`,
        `${normalizedLastName}${normalizedFirstName}@${provider}`,
        `${normalizedFirstName}${normalizedLastName}${Math.floor(
          Math.random() * 100
        )}@${provider}`,
        `${normalizedFirstName[0]}${normalizedLastName}@${provider}`,
      ];

      return formats[Math.floor(Math.random() * formats.length)];
    };

    const generateAvatarUrl = () => {
      // Generate a realistic avatar URL
      const avatarIds = [
        "1c55ae9a7a0744e5a65fa2c1e5d2c831",
        "54983eb9bd7b43029a1dfe1b7e64917b",
        "4ce8b2d5fa79422b96904a9ae6cc9bd4",
        "e8643b9351ca444c92ac75d86661b7d9",
        "33e58897c19242c5941cba50a494d59b",
        "9acf2d3ca4334612b1b330e411e1e3fa",
        "52368a93b0d149d3b05b7a42c9bf260a",
        "97a58fa275754127ab4c125ed0a1db4c",
        "5c4dfcb1d5934d42a3231a63f1d4281c",
        "0cdf1d3b1c7e4a67902eb7ad3913b0fc",
        "ca21efb5a90b457da8cefded97133e9f",
        "f65dc4a68a4a4c6cace7118ae7d70b3d",
        "21434c74dbff4bd884a204092b74ad89",
        "b494001b595e4ffc879825d6e356376e",
      ];

      return `https://res.cloudinary.com/homitutor/image/upload/v1683241476/avatars/${
        avatarIds[Math.floor(Math.random() * avatarIds.length)]
      }.jpg`;
    };

    const generateBio = () => {
      const bios = [
        "Tốt nghiệp chuyên ngành Toán ứng dụng tại Đại học Khoa học Tự nhiên Hà Nội. Có hơn 5 năm kinh nghiệm giảng dạy Toán cho học sinh THCS và THPT. Phương pháp dạy học tập trung vào xây dựng nền tảng kiến thức vững chắc và phát triển tư duy logic.",
        "Giáo viên tiếng Anh có chứng chỉ IELTS 8.0 và TESOL. Đã có kinh nghiệm giảng dạy tiếng Anh giao tiếp và luyện thi chứng chỉ quốc tế cho nhiều học sinh đạt kết quả cao.",
        "Giảng viên khoa Vật lý, Đại học Bách Khoa Hà Nội với hơn 8 năm kinh nghiệm. Chuyên sâu về Vật lý đại cương và Vật lý lượng tử. Giảng dạy theo phương pháp trực quan, gắn liền lý thuyết với thực tiễn.",
        "Tốt nghiệp loại giỏi ngành Ngữ văn, Đại học Sư phạm Hà Nội. Có kinh nghiệm luyện thi đại học môn Văn với phương pháp phân tích văn học sâu sắc, giúp học sinh nắm vững kỹ năng làm văn nghị luận.",
        "Thạc sĩ Hóa học tại Đại học Quốc gia TP.HCM. Có kinh nghiệm 6 năm giảng dạy Hóa học cho học sinh THPT và luyện thi đại học. Phương pháp giảng dạy tập trung vào hiểu nguyên lý và áp dụng vào giải bài tập.",
        "Giáo viên có 10 năm kinh nghiệm giảng dạy Tiếng Anh theo phương pháp giao tiếp. Từng du học tại Mỹ và có chứng chỉ CELTA. Chuyên dạy Tiếng Anh giao tiếp và luyện thi IELTS, TOEFL.",
        "Kỹ sư Công nghệ thông tin tại FPT Software. Có kinh nghiệm giảng dạy lập trình cho người mới bắt đầu. Chuyên về Java, Python và phát triển ứng dụng web. Hướng dẫn học sinh theo phương pháp thực hành và làm dự án thực tế.",
        "Tốt nghiệp Thạc sĩ Toán học ứng dụng tại Đại học Sư phạm TP.HCM. Có 7 năm kinh nghiệm giảng dạy Toán cho học sinh từ lớp 6 đến lớp 12. Phương pháp giảng dạy tập trung vào rèn luyện tư duy và kỹ năng giải quyết vấn đề.",
        "Giáo viên âm nhạc tốt nghiệp Học viện Âm nhạc Quốc gia Việt Nam. Chuyên dạy đàn piano, guitar và thanh nhạc. Có kinh nghiệm đào tạo học sinh tham gia các cuộc thi âm nhạc cấp quốc gia.",
        "Giảng viên tiếng Pháp tại Trung tâm Văn hóa Pháp. Có chứng chỉ DALF C2 và kinh nghiệm 5 năm giảng dạy tiếng Pháp cho mọi trình độ. Phương pháp giảng dạy tương tác, khuyến khích học viên giao tiếp ngay từ buổi học đầu tiên.",
        "Cử nhân Sinh học, Đại học Khoa học Tự nhiên TP.HCM. Có kinh nghiệm 4 năm dạy Sinh học cho học sinh THCS và THPT. Phương pháp giảng dạy trực quan với nhiều thí nghiệm minh họa, giúp học sinh hiểu sâu kiến thức.",
        "Thạc sĩ Lịch sử tại Đại học Khoa học Xã hội và Nhân văn. Đã có 9 năm kinh nghiệm giảng dạy Lịch sử và ôn thi đại học. Phương pháp dạy học sinh động, kết hợp phim tài liệu và câu chuyện lịch sử, giúp học sinh hiểu sâu và nhớ lâu.",
        "Giáo viên dạy Vẽ và Mỹ thuật với hơn 6 năm kinh nghiệm. Tốt nghiệp Đại học Mỹ thuật TP.HCM. Chuyên dạy kỹ thuật vẽ cơ bản, phác họa, vẽ màu nước và vẽ sơn dầu cho mọi lứa tuổi.",
        "Kỹ sư Điện tử - Viễn thông, có chứng chỉ sư phạm kỹ thuật. Chuyên dạy môn Tin học và Lập trình cho học sinh THPT và sinh viên đại học. Phương pháp giảng dạy tập trung vào thực hành và áp dụng kiến thức vào các dự án thực tế.",
        "Thạc sĩ Địa lý tại Đại học Sư phạm Hà Nội. Có kinh nghiệm giảng dạy Địa lý cho học sinh THPT và luyện thi đại học. Phương pháp giảng dạy trực quan với bản đồ, mô hình và hình ảnh, giúp học sinh dễ dàng nắm bắt kiến thức.",
        "Cử nhân Kinh tế đối ngoại, Đại học Ngoại thương. Có 5 năm kinh nghiệm giảng dạy Toán và Tiếng Anh cho học sinh THCS. Phương pháp giảng dạy tương tác, kết hợp với các trò chơi học tập để tạo hứng thú cho học sinh.",
        "Giáo viên dạy Tiếng Nhật với chứng chỉ JLPT N1. Đã có 7 năm kinh nghiệm giảng dạy tại các trung tâm ngoại ngữ. Phương pháp giảng dạy chú trọng vào giao tiếp và ngữ pháp thực hành.",
        "Thạc sĩ Vật lý thiên văn, Đại học Khoa học Tự nhiên Hà Nội. Có kinh nghiệm 6 năm giảng dạy Vật lý và Toán. Phương pháp giảng dạy tập trung vào hiểu bản chất vấn đề và áp dụng kiến thức giải quyết các bài toán thực tiễn.",
        "Giáo viên dạy Hóa học với 8 năm kinh nghiệm. Tốt nghiệp Thạc sĩ Hóa hữu cơ tại Đại học Khoa học Tự nhiên TP.HCM. Chuyên luyện thi đại học và ôn thi học sinh giỏi với phương pháp giảng dạy dễ hiểu và hiệu quả.",
      ];

      return bios[Math.floor(Math.random() * bios.length)];
    };

    const generateAvailability = () => {
      const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const timeSlots = [
        "08:00-10:00",
        "10:00-12:00",
        "13:00-15:00",
        "15:00-17:00",
        "17:00-19:00",
        "19:00-21:00",
      ];

      const availability: Record<string, string[]> = {};
      const numberOfDays = Math.floor(Math.random() * 5) + 2; // 2-6 days
      const selectedDays: string[] = [];

      while (selectedDays.length < numberOfDays) {
        const day = days[Math.floor(Math.random() * days.length)];
        if (!selectedDays.includes(day)) {
          selectedDays.push(day);
        }
      }

      selectedDays.forEach((day) => {
        const numberOfSlots = Math.floor(Math.random() * 3) + 1; // 1-3 slots per day
        const slots = [];

        // Select unique time slots for this day
        const dailyTimeSlots = [...timeSlots]; // Copy the array
        for (let i = 0; i < numberOfSlots; i++) {
          if (dailyTimeSlots.length === 0) break;
          const index = Math.floor(Math.random() * dailyTimeSlots.length);
          slots.push(dailyTimeSlots[index]);
          dailyTimeSlots.splice(index, 1); // Remove the selected slot
        }

        availability[day] = slots;
      });

      return JSON.stringify(availability);
    };

    const generateRandomDate = (start: Date, end: Date): Date => {
      return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
    };

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Admin
    let [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@homitutor.vn"));
    if (!admin) {
      [admin] = await db
        .insert(schema.users)
        .values({
          username: "admin",
          email: "admin@homitutor.vn",
          password: await bcrypt.hash("admin123", 10),
          first_name: "Quản",
          last_name: "Trị Viên",
          role: "admin",
          is_verified: true,
          is_active: true,
          avatar:
            "https://res.cloudinary.com/homitutor/image/upload/v1683241476/avatars/admin-avatar.jpg",
          phone: "0987654321",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    }

    // Subjects
    const subjects = [
      // Các môn cơ bản (cho mọi cấp học)
      {
        name: "Toán học",
        icon: "calculate",
        description:
          "Phát triển tư duy logic và kỹ năng giải quyết vấn đề qua các bài toán từ cơ bản đến nâng cao",
      },
      {
        name: "Tiếng Anh",
        icon: "language",
        description:
          "Nâng cao 4 kỹ năng nghe, nói, đọc, viết và chuẩn bị cho các kỳ thi quốc tế IELTS, TOEFL",
      },
      {
        name: "Ngữ văn",
        icon: "book-open",
        description:
          "Rèn luyện kỹ năng phân tích, cảm thụ văn học và phát triển tư duy phản biện",
      },

      // Môn khoa học tự nhiên
      {
        name: "Vật lý",
        icon: "bolt",
        description:
          "Khám phá các quy luật vận động của vật chất và ứng dụng vào thực tiễn cuộc sống",
      },
      {
        name: "Hóa học",
        icon: "science",
        description:
          "Tìm hiểu về cấu trúc, tính chất của vật chất và các phản ứng hóa học thông qua thí nghiệm",
      },
      {
        name: "Sinh học",
        icon: "biotech",
        description:
          "Khám phá thế giới sống từ cấp độ phân tử đến hệ sinh thái và ứng dụng trong y học, nông nghiệp",
      },

      // Môn khoa học xã hội
      {
        name: "Lịch sử",
        icon: "history",
        description:
          "Tìm hiểu về quá khứ để hiểu rõ hơn về hiện tại và định hướng tương lai",
      },
      {
        name: "Địa lý",
        icon: "public",
        description:
          "Khám phá thế giới tự nhiên và xã hội, mối quan hệ giữa con người với môi trường",
      },
      {
        name: "Giáo dục công dân",
        icon: "groups",
        description:
          "Học về quyền và nghĩa vụ công dân, đạo đức, pháp luật và kỹ năng sống",
      },

      // Các môn năng khiếu
      {
        name: "Âm nhạc",
        icon: "music_note",
        description:
          "Phát triển năng khiếu âm nhạc qua việc học nhạc cụ, thanh nhạc và lý thuyết âm nhạc",
      },
      {
        name: "Mỹ thuật",
        icon: "palette",
        description:
          "Khơi dậy sáng tạo nghệ thuật qua các kỹ thuật vẽ, hội họa và điêu khắc",
      },
      {
        name: "Thể dục thể thao",
        icon: "sports",
        description:
          "Rèn luyện sức khỏe, kỹ năng vận động và tinh thần đồng đội qua các môn thể thao",
      },

      // Môn công nghệ
      {
        name: "Tin học",
        icon: "computer",
        description:
          "Làm quen với máy tính, học các phần mềm cơ bản và ngôn ngữ lập trình cho mọi lứa tuổi",
      },
      {
        name: "Lập trình",
        icon: "code",
        description:
          "Học cách xây dựng website, ứng dụng di động và giải quyết vấn đề qua code",
      },

      // Dành cho sinh viên đại học
      {
        name: "Kinh tế học",
        icon: "trending_up",
        description:
          "Hiểu về các nguyên lý kinh tế vĩ mô, vi mô và phân tích dữ liệu kinh tế",
      },
      {
        name: "Kỹ năng mềm",
        icon: "psychology",
        description:
          "Phát triển kỹ năng giao tiếp, làm việc nhóm, quản lý thời gian và tư duy phản biện",
      },
    ];

    for (const sub of subjects) {
      await db
        .insert(schema.subjects)
        .values({
          ...sub,
          hourly_rate: "150000",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflictDoNothing();
    }

    // Education Levels
    const levels = [
      {
        name: "Tiểu học",
        description:
          "Hỗ trợ nền tảng học tập vững chắc cho các em học sinh 6-11 tuổi",
      },
      {
        name: "THCS",
        description:
          "Đồng hành cùng học sinh 11-15 tuổi vượt qua thử thách của bậc trung học cơ sở",
      },
      {
        name: "THPT",
        description:
          "Chuẩn bị kiến thức và kỹ năng cho kỳ thi quan trọng của học sinh 15-18 tuổi",
      },
      {
        name: "Đại học",
        description:
          "Hỗ trợ sinh viên trong các môn học chuyên ngành và nâng cao kiến thức học thuật",
      },
      {
        name: "Năng khiếu",
        description:
          "Phát triển tài năng và đam mê trong các lĩnh vực nghệ thuật, thể thao và công nghệ",
      },
    ];

    for (const level of levels) {
      await db
        .insert(schema.educationLevels)
        .values({
          ...level,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflictDoNothing();
    } // Task 1: Create 40 students
    console.log("Creating 40 students...");
    const studentUserIds = [];
    for (let i = 1; i <= 40; i++) {
      const nameData = generateVietnameseName();
      const { firstName, lastName, gender } = nameData;

      // Generate a birth date between 2003 and 2008
      const birthDate = formatDate(
        generateRandomDate(new Date(2003, 0, 1), new Date(2008, 11, 31))
      );

      const address = generateVietnameseAddress();
      const email = generateVietnameseEmail(firstName, lastName);
      const phone = generateVietnamesePhoneNumber();
      const avatar = generateAvatarUrl();

      try {
        const [student] = await db
          .insert(schema.users)
          .values({
            username: `student${i}`,
            email: email,
            password: await bcrypt.hash("123123", 10),
            first_name: firstName,
            last_name: lastName,
            role: "student",
            date_of_birth: birthDate,
            address: address,
            phone: phone,
            avatar: avatar,
            is_verified: true,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .onConflictDoNothing()
          .returning();

        if (student) {
          studentUserIds.push(student.id);
        }
      } catch (error) {
        console.error(`Error creating student ${i}:`, error);
      }
    }

    // Task 1 & 2: Create 80 tutors and 60 tutor profiles
    console.log("Creating 80 tutors...");
    const tutorUserIds = [];
    const verifiedTutorIds = [];
    const unverifiedTutorIds = [];

    const tutorOccupations = [
      "Giáo viên",
      "Giảng viên",
      "Sinh viên",
      "Kỹ sư",
      "Tiến sĩ",
      "Thạc sĩ",
      "Nhà nghiên cứu",
      "Chuyên viên",
      "Cử nhân",
    ];

    for (let i = 1; i <= 80; i++) {
      // Determine gender with roughly equal distribution
      const gender = i % 2 === 0 ? "male" : "female";
      const nameData = generateVietnameseName(gender);
      const { firstName, lastName } = nameData;

      // Generate a birth date between 1985 and 1995
      const birthDate = formatDate(
        generateRandomDate(new Date(1985, 0, 1), new Date(1995, 11, 31))
      );

      const address = generateVietnameseAddress();
      const email = generateVietnameseEmail(firstName, lastName);
      const phone = generateVietnamesePhoneNumber();
      const avatar = generateAvatarUrl();

      try {
        const [tutor] = await db
          .insert(schema.users)
          .values({
            username: `tutor${i}`,
            email: email,
            password: await bcrypt.hash("123123", 10),
            first_name: firstName,
            last_name: lastName,
            role: "tutor",
            date_of_birth: birthDate,
            address: address,
            phone: phone,
            avatar: avatar,
            is_verified: true,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .onConflictDoNothing()
          .returning();

        if (tutor) {
          tutorUserIds.push(tutor.id);

          // Create tutor profile for the first 60 tutors
          if (i <= 60) {
            const isVerified = i <= 40;
            const bio = generateBio();
            const availability = generateAvailability();
            const rating = (Math.random() * 1 + 3.5).toFixed(1); // Random rating between 3.5 and 4.5
            const totalReviews = Math.floor(Math.random() * 30); // Random number of reviews

            const [tutorProfile] = await db
              .insert(schema.tutorProfiles)
              .values({
                user_id: tutor.id,
                bio: bio,
                availability: availability,
                is_verified: isVerified,
                is_featured: i <= 10, // First 10 tutors are featured
                rating: rating,
                total_reviews: totalReviews,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .onConflictDoNothing()
              .returning();

            if (tutorProfile) {
              if (isVerified) {
                verifiedTutorIds.push(tutorProfile.id);
              } else {
                unverifiedTutorIds.push(tutorProfile.id);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error creating tutor ${i}:`, error);
      }
    } // Task 3: Create ~120 courses
    console.log("Creating courses for verified tutors...");

    // Get all subjects and education levels for reference
    const allSubjects = await db.select().from(schema.subjects);
    const allLevels = await db.select().from(schema.educationLevels);

    // Generate realistic course titles for different subjects
    const courseTitleTemplates = {
      "Toán học": [
        "Luyện thi THPT Quốc gia môn Toán",
        "Toán học nâng cao cho học sinh THPT",
        "Bồi dưỡng học sinh giỏi Toán",
        "Ôn thi vào lớp 10 môn Toán",
        "Toán cấp tốc cho kỳ thi đại học",
        "Phương pháp giải Toán trắc nghiệm hiệu quả",
      ],
      "Tiếng Anh": [
        "Tiếng Anh giao tiếp cơ bản",
        "Luyện thi IELTS 6.0+",
        "Tiếng Anh học thuật cho sinh viên đại học",
        "Tiếng Anh luyện thi THPT Quốc gia",
        "Ngữ pháp và từ vựng nâng cao",
        "Kỹ năng viết và đọc hiểu tiếng Anh",
      ],
      "Ngữ văn": [
        "Phân tích tác phẩm văn học Việt Nam",
        "Kỹ năng làm bài văn nghị luận",
        "Ôn tập văn học trung đại",
        "Phương pháp làm bài văn nghị luận xã hội",
        "Văn học hiện đại Việt Nam",
        "Rèn luyện kỹ năng viết sáng tạo",
      ],
      "Vật lý": [
        "Vật lý đại cương cho học sinh THPT",
        "Giải bài tập Vật lý nâng cao",
        "Luyện thi đại học môn Vật lý",
        "Phương pháp giải nhanh bài tập Vật lý",
        "Vật lý cho học sinh chuyên",
        "Ôn tập kiến thức trọng tâm Vật lý 12",
      ],
      "Hóa học": [
        "Hóa học cơ bản và nâng cao",
        "Phương pháp giải bài tập Hóa học THPT",
        "Luyện thi đại học môn Hóa",
        "Hóa học hữu cơ chuyên sâu",
        "Hóa học vô cơ và phân tích",
        "Kỹ năng làm bài thi trắc nghiệm môn Hóa",
      ],
      "Sinh học": [
        "Sinh học cơ bản cho học sinh THPT",
        "Ôn thi đại học môn Sinh học",
        "Di truyền học và ứng dụng",
        "Giải phẫu và sinh lý học người",
        "Sinh thái học và môi trường",
        "Sinh học phân tử cơ bản",
      ],
      "Lịch sử": [
        "Lịch sử Việt Nam từ nguồn gốc đến hiện đại",
        "Phương pháp học Lịch sử hiệu quả",
        "Ôn tập Lịch sử thế giới hiện đại",
        "Kỹ năng làm bài thi trắc nghiệm môn Lịch sử",
        "Các triều đại phong kiến Việt Nam",
        "Lịch sử Việt Nam hiện đại",
      ],
      "Địa lý": [
        "Địa lý tự nhiên Việt Nam",
        "Địa lý kinh tế xã hội",
        "Ôn tập Địa lý cho kỳ thi THPT Quốc gia",
        "Địa lý thế giới và khu vực",
        "Phương pháp làm bài thi Địa lý đạt điểm cao",
        "Địa lý du lịch Việt Nam",
      ],
      "Tin học": [
        "Tin học văn phòng cơ bản",
        "Lập trình C++ cho người mới bắt đầu",
        "Thiết kế web cơ bản với HTML và CSS",
        "Excel nâng cao cho công việc",
        "Lập trình Python cơ bản",
        "Công nghệ thông tin đại cương",
      ],
      "Lập trình": [
        "Lập trình Java từ cơ bản đến nâng cao",
        "Phát triển ứng dụng web với React",
        "Lập trình game với Unity",
        "Phân tích và thiết kế hệ thống",
        "Lập trình hướng đối tượng với C#",
        "Phát triển ứng dụng di động",
      ],
      "Kinh tế học": [
        "Kinh tế vĩ mô cơ bản",
        "Phân tích tài chính doanh nghiệp",
        "Marketing căn bản",
        "Nguyên lý kế toán",
        "Quản trị nhân sự",
        "Kinh tế quốc tế",
      ],
      "Kỹ năng mềm": [
        "Kỹ năng giao tiếp hiệu quả",
        "Thuyết trình chuyên nghiệp",
        "Quản lý thời gian và năng suất",
        "Tư duy phản biện và giải quyết vấn đề",
        "Kỹ năng làm việc nhóm",
        "Kỹ năng lãnh đạo bản thân",
      ],
      "Âm nhạc": [
        "Học đàn Guitar cơ bản",
        "Piano cho người mới bắt đầu",
        "Nhạc lý cơ bản",
        "Thanh nhạc và phát âm",
        "Sáng tác nhạc đơn giản",
        "Học đọc và viết nhạc",
      ],
      "Mỹ thuật": [
        "Vẽ phác họa cơ bản",
        "Hội họa màu nước",
        "Vẽ chân dung và tĩnh vật",
        "Nghệ thuật trang trí nội thất",
        "Thiết kế đồ họa cơ bản",
        "Điêu khắc và nặn tượng",
      ],
    };

    // Helper function to get course templates for a subject
    const getCourseTemplatesForSubject = (subjectName: string) => {
      // Find the exact match first
      for (const [key, templates] of Object.entries(courseTitleTemplates)) {
        if (key === subjectName) return templates;
      }

      // If no exact match, use defaults
      return [
        `Khóa học ${subjectName} cơ bản`,
        `${subjectName} nâng cao`,
        `Luyện thi ${subjectName} hiệu quả`,
        `Phương pháp học ${subjectName} đạt điểm cao`,
        `${subjectName} cho học sinh yếu và trung bình`,
        `${subjectName} chuyên sâu`,
      ];
    };

    // Helper function to generate course description
    const generateCourseDescription = (
      title: string,
      subjectName: string
    ): string => {
      const descriptions = [
        `Khóa học ${title} được thiết kế dành riêng cho học sinh muốn nâng cao kiến thức về ${subjectName}. Giáo viên sẽ hướng dẫn từng bước, giúp học sinh nắm vững kiến thức nền tảng và phát triển kỹ năng giải quyết vấn đề. Khóa học bao gồm nhiều bài tập thực hành và đề thi mẫu để học sinh làm quen với các dạng câu hỏi thường gặp.`,

        `${title} là chương trình học được biên soạn kỹ lưỡng, tập trung vào việc phát triển tư duy logic và khả năng tự học của học sinh. Qua khóa học này, học sinh sẽ được trang bị những phương pháp học tập hiệu quả, kỹ năng phân tích và giải quyết bài toán một cách hệ thống. Đặc biệt chú trọng đến việc áp dụng kiến thức vào thực tiễn.`,

        `Với phương pháp giảng dạy tương tác, khóa học ${title} giúp học sinh tiếp thu kiến thức nhanh chóng và hiệu quả. Giáo viên sẽ sử dụng nhiều phương tiện trực quan, bài tập đa dạng và tình huống thực tế để minh họa các khái niệm phức tạp, giúp học sinh dễ dàng nắm bắt và ghi nhớ lâu dài.`,

        `Khóa học ${title} đặc biệt phù hợp cho các em học sinh đang chuẩn bị cho kỳ thi quan trọng. Nội dung được thiết kế bám sát chương trình học và cấu trúc đề thi mới nhất. Học sinh sẽ được hướng dẫn các chiến lược làm bài hiệu quả, kỹ thuật giải nhanh và chính xác, cùng với nhiều bí quyết để đạt điểm cao trong các kỳ thi.`,

        `${title} là khóa học toàn diện giúp học sinh xây dựng nền tảng kiến thức vững chắc về ${subjectName}. Khóa học không chỉ truyền đạt kiến thức học thuật mà còn phát triển kỹ năng tư duy phản biện, khả năng giải quyết vấn đề và tinh thần học tập suốt đời. Với phương pháp "học đi đôi với hành", học sinh sẽ được thực hành ngay sau mỗi bài học lý thuyết.`,

        `Được thiết kế bởi đội ngũ giáo viên giàu kinh nghiệm, khóa học ${title} cung cấp một lộ trình học tập khoa học và hiệu quả. Từ kiến thức cơ bản đến nâng cao, mỗi bài học đều được xây dựng một cách cẩn thận nhằm giúp học sinh tiến bộ từng ngày. Khóa học còn tích hợp các kỹ thuật ghi nhớ và ôn tập định kỳ để củng cố kiến thức.`,
      ];

      return descriptions[Math.floor(Math.random() * descriptions.length)];
    };

    // Create courses for verified tutors
    let courseCount = 0;
    for (const tutorId of verifiedTutorIds) {
      // Each verified tutor will have 1-4 courses
      const numberOfCourses = Math.floor(Math.random() * 4) + 1;

      for (let i = 0; i < numberOfCourses; i++) {
        // Select random subject and level
        const subject =
          allSubjects[Math.floor(Math.random() * allSubjects.length)];
        const level = allLevels[Math.floor(Math.random() * allLevels.length)];

        // Get course templates for this subject
        const courseTemplates = getCourseTemplatesForSubject(subject.name);
        const courseTitle =
          courseTemplates[Math.floor(Math.random() * courseTemplates.length)];

        // Generate course description
        const courseDescription = generateCourseDescription(
          courseTitle,
          subject.name
        );

        // Generate random hourly rate between 120,000 and 250,000 VND
        const hourlyRate = (Math.floor(Math.random() * 14) + 12) * 10000;

        // Random teaching mode
        const teachingMode = Math.random() > 0.5 ? "online" : "offline";

        try {
          await db
            .insert(schema.courses)
            .values({
              tutor_id: tutorId,
              subject_id: subject.id,
              level_id: level.id,
              title: courseTitle,
              description: courseDescription,
              hourly_rate: hourlyRate.toString(),
              teaching_mode: teachingMode,
              status: "active",
              created_at: new Date(),
              updated_at: new Date(),
            })
            .onConflictDoNothing();

          courseCount++;
        } catch (error) {
          console.error(`Error creating course for tutor ${tutorId}:`, error);
        }
      }
    }

    console.log(`Created ${courseCount} courses successfully.`);

    // Task 4: Create 20 teaching requests from unverified tutors
    console.log("Creating teaching requests for unverified tutors...");

    // Generate introduction and experience texts
    const generateIntroduction = (subjectName: string) => {
      const introductions = [
        `Tôi là giáo viên có 5 năm kinh nghiệm giảng dạy ${subjectName} tại các trường THPT và trung tâm gia sư. Tôi muốn đăng ký làm gia sư trên nền tảng để chia sẻ kiến thức và giúp đỡ các em học sinh tiến bộ trong môn học này.`,

        `Sau khi tốt nghiệp đại học chuyên ngành ${subjectName}, tôi đã có 3 năm kinh nghiệm dạy kèm cho học sinh từ lớp 6 đến lớp 12. Phương pháp giảng dạy của tôi tập trung vào việc giúp học sinh hiểu rõ bản chất vấn đề thay vì học vẹt.`,

        `Tôi là sinh viên năm cuối chuyên ngành ${subjectName} tại Đại học Quốc gia Hà Nội. Tôi đã có kinh nghiệm dạy kèm và muốn trở thành gia sư chuyên nghiệp trên nền tảng này để chia sẻ kiến thức và phương pháp học hiệu quả cho các em học sinh.`,

        `Với bề dày kinh nghiệm giảng dạy ${subjectName} và thành tích đạt giải trong các kỳ thi học sinh giỏi, tôi tin rằng mình có thể giúp học sinh tiến bộ nhanh chóng và đạt kết quả cao trong học tập.`,

        `Tôi muốn đăng ký làm gia sư môn ${subjectName} vì đam mê giảng dạy và mong muốn truyền đạt kiến thức cho thế hệ trẻ. Tôi có thể dạy từ cơ bản đến nâng cao, với phương pháp trực quan và dễ hiểu.`,
      ];

      return introductions[Math.floor(Math.random() * introductions.length)];
    };

    const generateExperience = (subjectName: string) => {
      const experiences = [
        `Tôi có kinh nghiệm giảng dạy ${subjectName} trong 4 năm qua. Học sinh của tôi đã đạt được nhiều thành tích cao trong các kỳ thi học sinh giỏi cấp trường và cấp quận. Tôi thường xuyên cập nhật phương pháp giảng dạy hiện đại và áp dụng công nghệ vào bài giảng.`,

        `Trước đây, tôi từng dạy ${subjectName} tại Trung tâm Gia sư Thành Công trong 2 năm. Đồng thời, tôi cũng có kinh nghiệm dạy kèm tại nhà cho học sinh từ lớp 6 đến lớp 12. Tôi hiểu rõ chương trình học và cách tiếp cận phù hợp với từng độ tuổi học sinh.`,

        `Tôi đã có 3 năm kinh nghiệm dạy ${subjectName} tại trường THPT và 2 năm làm gia sư. Phương pháp giảng dạy của tôi là "học thông qua hành", giúp học sinh hiểu sâu kiến thức thông qua các bài tập thực hành và ứng dụng thực tế.`,

        `Kinh nghiệm giảng dạy ${subjectName} của tôi bao gồm việc biên soạn giáo trình, thiết kế bài giảng và đề thi cho các trung tâm gia sư. Tôi có khả năng phân tích điểm mạnh, điểm yếu của học sinh để đưa ra phương pháp học tập phù hợp nhất.`,

        `Tôi đã tốt nghiệp loại giỏi chuyên ngành ${subjectName} và có 2 năm kinh nghiệm dạy kèm. Tôi đặc biệt giỏi trong việc giúp học sinh yếu và trung bình tiến bộ nhanh chóng thông qua các phương pháp học tập trực quan và dễ nhớ.`,
      ];

      return experiences[Math.floor(Math.random() * experiences.length)];
    };

    // Generate certification URLs
    const generateCertificationUrls = () => {
      const certificationImages = [
        "https://res.cloudinary.com/homitutor/image/upload/v1684241476/certifications/cert1.jpg",
        "https://res.cloudinary.com/homitutor/image/upload/v1684241476/certifications/cert2.jpg",
        "https://res.cloudinary.com/homitutor/image/upload/v1684241476/certifications/cert3.jpg",
        "https://res.cloudinary.com/homitutor/image/upload/v1684241476/certifications/cert4.jpg",
        "https://res.cloudinary.com/homitutor/image/upload/v1684241476/certifications/cert5.jpg",
      ];

      // 50% chance to have certifications
      if (Math.random() > 0.5) {
        const numberOfCerts = Math.floor(Math.random() * 3) + 1;
        const selectedCerts: string[] = [];

        for (let i = 0; i < numberOfCerts; i++) {
          const certImage =
            certificationImages[
              Math.floor(Math.random() * certificationImages.length)
            ];
          if (!selectedCerts.includes(certImage)) {
            selectedCerts.push(certImage);
          }
        }

        return JSON.stringify(selectedCerts);
      }

      return null;
    };

    // Create teaching requests
    let requestCount = 0;
    for (const tutorId of unverifiedTutorIds) {
      if (requestCount >= 20) break;

      // Select random subject and level
      const subject =
        allSubjects[Math.floor(Math.random() * allSubjects.length)];
      const level = allLevels[Math.floor(Math.random() * allLevels.length)];

      const introduction = generateIntroduction(subject.name);
      const experience = generateExperience(subject.name);
      const certifications = generateCertificationUrls();

      try {
        await db
          .insert(schema.teachingRequests)
          .values({
            tutor_id: tutorId,
            subject_id: subject.id,
            level_id: level.id,
            introduction: introduction,
            experience: experience,
            certifications: certifications,
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
          })
          .onConflictDoNothing();

        requestCount++;
      } catch (error) {
        console.error(
          `Error creating teaching request for tutor ${tutorId}:`,
          error
        );
      }
    }

    console.log(`Created ${requestCount} teaching requests successfully.`);

    console.log("✅ Seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();
