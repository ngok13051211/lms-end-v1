// seed.ts
import { db } from "./index";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Create a common password hash for all users
    const passwordHash = await bcrypt.hash("123123", 10);

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
          avatar: "",
          phone: "0987654321",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    }

    // ======= INSERT USERS =======
    // Create 10 tutors and 10 students with realistic Vietnamese information
    const tutors = [
      {
        username: "nguyenthanhminh",
        email: "nguyenthanhminh@gmail.com",
        password: passwordHash,
        first_name: "Minh",
        last_name: "Nguyễn Thanh",
        role: "tutor",
        date_of_birth: new Date("1990-05-15").toISOString(),
        address: "123 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        phone: "0901234567",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamthihuong",
        email: "phamthihuong@gmail.com",
        password: passwordHash,
        first_name: "Hương",
        last_name: "Phạm Thị",
        role: "tutor",
        date_of_birth: new Date("1988-09-23").toISOString(),
        address: "45 Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh",
        phone: "0912345678",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranthiha",
        email: "tranthiha@gmail.com",
        password: passwordHash,
        first_name: "Hà",
        last_name: "Trần Thị",
        role: "tutor",
        date_of_birth: new Date("1992-03-12").toISOString(),
        address: "78 Đồng Khởi, Quận 1, TP. Hồ Chí Minh",
        phone: "0923456789",
        avatar: "https://randomuser.me/api/portraits/women/3.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "levantrung",
        email: "levantrung@gmail.com",
        password: passwordHash,
        first_name: "Trung",
        last_name: "Lê Văn",
        role: "tutor",
        date_of_birth: new Date("1985-11-07").toISOString(),
        address: "234 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh",
        phone: "0934567890",
        avatar: "https://randomuser.me/api/portraits/men/4.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "vuthihien",
        email: "vuthihien@gmail.com",
        password: passwordHash,
        first_name: "Hiền",
        last_name: "Vũ Thị",
        role: "tutor",
        date_of_birth: new Date("1991-04-25").toISOString(),
        address: "56 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh",
        phone: "0945678901",
        avatar: "https://randomuser.me/api/portraits/women/5.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenvanhai",
        email: "nguyenvanhai@gmail.com",
        password: passwordHash,
        first_name: "Hải",
        last_name: "Nguyễn Văn",
        role: "tutor",
        date_of_birth: new Date("1989-07-30").toISOString(),
        address: "102 Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh",
        phone: "0956789012",
        avatar: "https://randomuser.me/api/portraits/men/6.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "hoangthilan",
        email: "hoangthilan@gmail.com",
        password: passwordHash,
        first_name: "Lan",
        last_name: "Hoàng Thị",
        role: "tutor",
        date_of_birth: new Date("1993-02-14").toISOString(),
        address: "75 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh",
        phone: "0967890123",
        avatar: "https://randomuser.me/api/portraits/women/7.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranvanduc",
        email: "tranvanduc@gmail.com",
        password: passwordHash,
        first_name: "Đức",
        last_name: "Trần Văn",
        role: "tutor",
        date_of_birth: new Date("1987-10-05").toISOString(),
        address: "321 Võ Văn Ngân, Quận Thủ Đức, TP. Hồ Chí Minh",
        phone: "0978901234",
        avatar: "https://randomuser.me/api/portraits/men/8.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamthithanh",
        email: "phamthithanh@gmail.com",
        password: passwordHash,
        first_name: "Thanh",
        last_name: "Phạm Thị",
        role: "tutor",
        date_of_birth: new Date("1994-06-18").toISOString(),
        address: "189 Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh",
        phone: "0989012345",
        avatar: "https://randomuser.me/api/portraits/women/9.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "dangvantuan",
        email: "dangvantuan@gmail.com",
        password: passwordHash,
        first_name: "Tuấn",
        last_name: "Đặng Văn",
        role: "tutor",
        date_of_birth: new Date("1986-12-22").toISOString(),
        address: "67 Phạm Ngọc Thạch, Quận 3, TP. Hồ Chí Minh",
        phone: "0990123456",
        avatar: "https://randomuser.me/api/portraits/men/10.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const students = [
      {
        username: "nguyenthinguyen",
        email: "nguyenthinguyen@gmail.com",
        password: passwordHash,
        first_name: "Nguyên",
        last_name: "Nguyễn Thị",
        role: "student",
        date_of_birth: new Date("2000-02-10").toISOString(),
        address: "45 Trần Phú, Quận 5, TP. Hồ Chí Minh",
        phone: "0801234567",
        avatar: "https://randomuser.me/api/portraits/women/11.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranvanbinh",
        email: "tranvanbinh@gmail.com",
        password: passwordHash,
        first_name: "Bình",
        last_name: "Trần Văn",
        role: "student",
        date_of_birth: new Date("1998-08-15").toISOString(),
        address: "123 Bà Hạt, Quận 10, TP. Hồ Chí Minh",
        phone: "0812345678",
        avatar: "https://randomuser.me/api/portraits/men/12.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "levanthanh",
        email: "levanthanh@gmail.com",
        password: passwordHash,
        first_name: "Thành",
        last_name: "Lê Văn",
        role: "student",
        date_of_birth: new Date("1999-04-20").toISOString(),
        address: "56 Lê Văn Sỹ, Quận Phú Nhuận, TP. Hồ Chí Minh",
        phone: "0823456789",
        avatar: "https://randomuser.me/api/portraits/men/13.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "vothihong",
        email: "vothihong@gmail.com",
        password: passwordHash,
        first_name: "Hồng",
        last_name: "Võ Thị",
        role: "student",
        date_of_birth: new Date("2001-07-05").toISOString(),
        address: "234 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
        phone: "0834567890",
        avatar: "https://randomuser.me/api/portraits/women/14.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenminhquang",
        email: "nguyenminhquang@gmail.com",
        password: passwordHash,
        first_name: "Quang",
        last_name: "Nguyễn Minh",
        role: "student",
        date_of_birth: new Date("2002-11-30").toISOString(),
        address: "78 Đinh Tiên Hoàng, Quận 1, TP. Hồ Chí Minh",
        phone: "0845678901",
        avatar: "https://randomuser.me/api/portraits/men/15.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranthihue",
        email: "tranthihue@gmail.com",
        password: passwordHash,
        first_name: "Huệ",
        last_name: "Trần Thị",
        role: "student",
        date_of_birth: new Date("2000-09-12").toISOString(),
        address: "90 Bà Triệu, Quận 1, TP. Hồ Chí Minh",
        phone: "0856789012",
        avatar: "https://randomuser.me/api/portraits/women/16.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamvanthanh",
        email: "phamvanthanh@gmail.com",
        password: passwordHash,
        first_name: "Thành",
        last_name: "Phạm Văn",
        role: "student",
        date_of_birth: new Date("1997-03-25").toISOString(),
        address: "123 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh",
        phone: "0867890123",
        avatar: "https://randomuser.me/api/portraits/men/17.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "hoangthuhuong",
        email: "hoangthuhuong@gmail.com",
        password: passwordHash,
        first_name: "Hương",
        last_name: "Hoàng Thu",
        role: "student",
        date_of_birth: new Date("1999-01-15").toISOString(),
        address: "45 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh",
        phone: "0878901234",
        avatar: "https://randomuser.me/api/portraits/women/18.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "lethihoa",
        email: "lethihoa@gmail.com",
        password: passwordHash,
        first_name: "Hoa",
        last_name: "Lê Thị",
        role: "student",
        date_of_birth: new Date("2002-05-20").toISOString(),
        address: "67 Phan Đình Phùng, Quận Phú Nhuận, TP. Hồ Chí Minh",
        phone: "0889012345",
        avatar: "https://randomuser.me/api/portraits/women/19.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenduchuy",
        email: "nguyenduchuy@gmail.com",
        password: passwordHash,
        first_name: "Huy",
        last_name: "Nguyễn Đức",
        role: "student",
        date_of_birth: new Date("2001-10-10").toISOString(),
        address: "34 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
        phone: "0890123456",
        avatar: "https://randomuser.me/api/portraits/men/20.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Check for existing users first to avoid duplicates
    const existingUsers = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(
        sql`${schema.users.email} IN (${[...tutors, ...students]
          .map((user) => user.email)
          .join(",")})`
      );

    const existingEmails = new Set(existingUsers.map((user) => user.email));

    // Filter out any users that already exist in the database
    const newTutors = tutors.filter(
      (tutor) => !existingEmails.has(tutor.email)
    );
    const newStudents = students.filter(
      (student) => !existingEmails.has(student.email)
    );
    // Combine the filtered arrays
    const usersToInsert = [...newTutors, ...newStudents]; // Map through your users and convert dates properly according to schema expectations
    const usersWithProperDates = usersToInsert.map((user) => {
      // Create a base user object with the date fields converted
      const userWithDates = {
        ...user,
        created_at: new Date(user.created_at), // Convert string to Date object
        updated_at: new Date(user.updated_at), // Convert string to Date object
      };

      // Handle date_of_birth specially based on its expected type in the schema
      if (user.date_of_birth) {
        // In the schema, date_of_birth is a text field, so we keep it as string
        userWithDates.date_of_birth = user.date_of_birth; // Keep as string since schema expects text type
      }

      return userWithDates;
    });

    // Use the converted array for insertion
    const insertedUsers =
      usersWithProperDates.length > 0
        ? await db.insert(schema.users).values(usersWithProperDates).returning({
            id: schema.users.id,
            email: schema.users.email,
            role: schema.users.role,
          })
        : [];

    console.log(
      `✅ Inserted ${insertedUsers.length} users. ${existingEmails.size} users already existed.`
    );

    // ======= INSERT SUBJECTS =======
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
        icon: "book_open",
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

    // Insert subjects and record their IDs for later association
    const insertedSubjectsMap = new Map();
    for (const sub of subjects) {
      // Add the created_at and updated_at fields to the subject data
      const subjectData = {
        ...sub,
        created_at: new Date(), // Use Date object directly, not string
        updated_at: new Date(), // Use Date object directly, not string
      };

      try {
        // Try to insert the subject
        const [insertedSub] = await db
          .insert(schema.subjects)
          .values(subjectData)
          .onConflictDoNothing()
          .returning();

        if (insertedSub) {
          insertedSubjectsMap.set(insertedSub.name, insertedSub.id);
        } else {
          // If not inserted (already exists), get the existing subject ID
          const [existingSub] = await db
            .select()
            .from(schema.subjects)
            .where(eq(schema.subjects.name, sub.name));

          if (existingSub) {
            insertedSubjectsMap.set(existingSub.name, existingSub.id);
          }
        }
      } catch (error) {
        console.error(`Error inserting subject ${sub.name}:`, error);
      }
    }

    // ======= INSERT EDUCATION LEVELS =======
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
    ]; // Insert education levels and record their IDs for later association
    const insertedLevelsMap = new Map();
    for (const level of levels) {
      const currentDate = new Date();
      // Add the created_at and updated_at fields to the level data
      const levelData = {
        ...level,
        created_at: currentDate, // Use Date object directly, not string
        updated_at: currentDate, // Use Date object directly, not string
      };

      try {
        // Try to insert the education level
        const [insertedLevel] = await db
          .insert(schema.educationLevels)
          .values(levelData)
          .onConflictDoNothing()
          .returning();

        if (insertedLevel) {
          insertedLevelsMap.set(insertedLevel.name, insertedLevel.id);
        } else {
          // If not inserted (already exists), get the existing level ID
          const [existingLevel] = await db
            .select()
            .from(schema.educationLevels)
            .where(eq(schema.educationLevels.name, level.name));

          if (existingLevel) {
            insertedLevelsMap.set(existingLevel.name, existingLevel.id);
          }
        }
      } catch (error) {
        console.error(`Error inserting education level ${level.name}:`, error);
      }
    }

    // ======= ASSOCIATE SUBJECTS WITH EDUCATION LEVELS =======
    // Define which subjects are applicable to which education levels
    const subjectLevelAssociations = [
      // Các môn cơ bản - Tất cả các cấp học
      {
        subjectName: "Toán học",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Tiếng Anh",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Ngữ văn",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },

      // Khoa học tự nhiên - Từ THCS trở lên
      { subjectName: "Vật lý", levels: ["THCS", "THPT", "Đại học"] },
      { subjectName: "Hóa học", levels: ["THCS", "THPT", "Đại học"] },
      { subjectName: "Sinh học", levels: ["THCS", "THPT", "Đại học"] },

      // Khoa học xã hội
      {
        subjectName: "Lịch sử",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Địa lý",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Giáo dục công dân",
        levels: ["Tiểu học", "THCS", "THPT"],
      },

      // Các môn năng khiếu
      {
        subjectName: "Âm nhạc",
        levels: ["Tiểu học", "THCS", "THPT", "Năng khiếu"],
      },
      {
        subjectName: "Mỹ thuật",
        levels: ["Tiểu học", "THCS", "THPT", "Năng khiếu"],
      },
      {
        subjectName: "Thể dục thể thao",
        levels: ["Tiểu học", "THCS", "THPT", "Năng khiếu"],
      },

      // Môn công nghệ
      {
        subjectName: "Tin học",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Lập trình",
        levels: ["THCS", "THPT", "Đại học", "Năng khiếu"],
      },

      // Dành cho sinh viên đại học
      { subjectName: "Kinh tế học", levels: ["Đại học"] },
      { subjectName: "Kỹ năng mềm", levels: ["THPT", "Đại học"] },
    ];

    // Create subject-level associations in the database
    for (const assoc of subjectLevelAssociations) {
      const subjectId = insertedSubjectsMap.get(assoc.subjectName);

      if (!subjectId) {
        console.warn(
          `Subject "${assoc.subjectName}" not found. Skipping associations.`
        );
        continue;
      }

      for (const levelName of assoc.levels) {
        const levelId = insertedLevelsMap.get(levelName);

        if (!levelId) {
          console.warn(
            `Education level "${levelName}" not found. Skipping association.`
          );
          continue;
        }

        try {
          // Insert subject-education level association
          await db
            .insert(schema.subjectEducationLevels)
            .values({
              subject_id: subjectId,
              level_id: levelId,
              created_at: new Date(), // Use Date object directly, not string
            })
            .onConflictDoNothing();
        } catch (error) {
          console.error(
            `Error associating subject ${assoc.subjectName} with level ${levelName}:`,
            error
          );
        }
      }
    }
    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );

    // Exit with error code to indicate failure
    process.exit(1);
  }
}

seed();
